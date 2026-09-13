#!/usr/bin/env node
/**
 * Verifies the proposed board -> tag resolution rule against all 66 boards.
 *
 * THE RULE
 *
 *   candidates(board) = { tag : tag.slug === board }        // what happens today
 *                     ∪ { tag : norm(tag.name) === board }  // the addition
 *
 *   ...then query all of them at once: `?tags=a,b` unions and de-duplicates.
 *
 * Why the union rather than picking a winner: a keyword-less tag contributes
 * zero items, so including it costs nothing, and that removes the need to
 * decide which of a duplicate pair is "real" — the reason the earlier
 * mapping-table approach went wrong. It also makes the rule strictly additive:
 * today's behaviour is the first half of the union, so no board can regress.
 *
 * WHY NAME AND NOT KEYWORDS
 *
 * Board slugs and tag slugs are unrelated internal ids (`polygon` vs
 * `matic-network`), so `name` is the only human-readable field the two sides
 * share. Matching on keywords as well was measured and rejected: it rescues
 * `kyber` (0 -> 21) but takes `base` from 1,859 to 8,215, because the
 * `coinbase` tag carries `base` as a keyword. Flooding the Base board with
 * Coinbase coverage is a worse defect than the one being fixed.
 *
 * WHY EXACT EQUALITY AND NOT SUBSTRING
 *
 * `contains` pulls 50 tags for `polygon` — every DEX deployment on the chain —
 * to add 37 items. The set stops being explainable and grows on its own as
 * tags are added. Exact equality keeps nearly all the benefit and stays
 * bounded.
 *
 *   node --env-file-if-exists=.env.local scripts/audit-tag-resolution.mjs
 */
const API = "https://api.alphaday.com";
const appId = process.env.API_APP_ID ?? process.env.VITE_X_APP_ID;
const appSecret = process.env.API_APP_SECRET ?? process.env.VITE_X_APP_SECRET;
if (!appId || !appSecret) {
  console.error("audit-tag-resolution: set API_APP_ID / API_APP_SECRET");
  process.exit(1);
}
const headers = { "x-app-id": appId, "x-app-secret": appSecret };

// C3's threshold: below this many items a week a recap page has nothing to say.
const RECAP_FLOOR = 20;

/**
 * Boards the rule cannot reach, because the board uses a short name and the
 * taxonomy uses the full one. Nothing matches, so there is nothing to union.
 *
 * Three rows, and they are the entire manual surface of this fix — which is
 * the argument for the rule over a hand-written map of all fourteen.
 */
const MANUAL = {
  kyber: "kyber-network", // tag is named "kyber network"
  sia: "siacoin", // tag is named "siacoin"
  impossible: "impossible-finance", // tag is named "impossible finance"
};

// No tag expected: an audience category and Alphaday's own AI.
const NO_TAG_EXPECTED = new Set(["beginner", "kasandra"]);

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function getJson(url) {
  const ATTEMPTS = 5;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return res.json();
    } catch {
      // fall through to the retry
    }
    if (attempt < ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
  throw new Error(`could not fetch ${url}`);
}

async function pagedAll(url) {
  const out = [];
  let next = url;
  while (next) {
    const body = await getJson(next);
    out.push(...(body.results ?? []));
    next = body.links?.next;
  }
  return out;
}

/**
 * A failed request must not read as zero.
 *
 * An earlier version returned `null` on a non-OK response, and `null` compares
 * as 0 — so a transient API error on the "before" query made a working board
 * look newly fixed. `ethereum` did exactly that on the first run: `null -> 27194`,
 * reported as an improvement when nothing had changed. Retry, then throw.
 */
const total = async (tagList, extra = "") => {
  if (!tagList) return 0;
  const url = `${API}/items/news/?tags=${encodeURIComponent(tagList)}&limit=1${extra}`;
  // api.alphaday.com drops connections in bursts lasting tens of seconds, so
  // the backoff has to outlast one. Five attempts at 1s, 2s, 4s, 8s.
  const ATTEMPTS = 5;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return (await res.json()).total ?? 0;
    } catch {
      // fall through to the retry
    }
    if (attempt < ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
  throw new Error(`could not measure ${url}`);
};

async function mapPool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const n = i++;
        out[n] = await fn(items[n]);
      }
    })
  );
  return out;
}

const main = async () => {
  const tags = await pagedAll(`${API}/tags/?limit=500`);
  const boards = (await pagedAll(`${API}/ui/landing-pages/`))
    .filter((r) => r.is_published !== false)
    .map((r) => r.slug)
    .sort();

  console.log(`${tags.length} tags, ${boards.length} published boards\n`);

  const resolve = (board) => [
    ...new Set([
      ...tags.filter((t) => t.slug === board).map((t) => t.slug),
      ...tags.filter((t) => norm(t.name) === norm(board)).map((t) => t.slug),
      ...(MANUAL[board] ? [MANUAL[board]] : []),
    ]),
  ];

  const rows = await mapPool(boards, 3, async (board) => {
    const set = resolve(board);
    const [now, next, week] = await Promise.all([
      total(board),
      total(set.join(",")),
      total(set.join(","), "&period=1"),
    ]);
    return { board, set, now, next, week };
  });

  const improved = rows.filter((r) => r.next > r.now);
  const regressed = rows.filter((r) => r.next < r.now);
  const empty = rows.filter(
    (r) => r.next === 0 && !NO_TAG_EXPECTED.has(r.board)
  );

  console.log("Boards improved by the rule:");
  for (const r of [...improved].sort((a, b) => b.next - a.next)) {
    const via = MANUAL[r.board] ? " (manual pairing)" : "";
    console.log(
      `  ${r.board.padEnd(18)} ${String(r.now).padStart(5)} -> ${String(r.next).padStart(5)}` +
        `   [${r.set.join(", ")}]${via}`
    );
  }

  console.log(
    `\n  improved ${improved.length}   unchanged ${rows.length - improved.length - regressed.length}   regressed ${regressed.length}`
  );
  if (regressed.length) {
    console.log("  REGRESSIONS — the rule must be strictly additive:");
    for (const r of regressed) console.log(`    ${r.board}: ${r.now} -> ${r.next}`);
  }

  console.log(
    `\nStill empty (excluding the ${NO_TAG_EXPECTED.size} expected): ` +
      `${empty.length ? empty.map((r) => r.board).join(", ") : "none"}`
  );

  const recap = rows.filter((r) => r.week >= RECAP_FLOOR);
  console.log(
    `\nC3 recap tier — boards with >= ${RECAP_FLOOR} news items in the last week:`
  );
  console.log(`  ${recap.length} of ${rows.length} qualify.`);
  const live = rows.filter((r) => r.week > 0);
  console.log(
    `  distribution: ${live.filter((r) => r.week >= 100).length} over 100/wk, ` +
      `${live.filter((r) => r.week >= RECAP_FLOOR && r.week < 100).length} between ${RECAP_FLOOR} and 100, ` +
      `${live.filter((r) => r.week < RECAP_FLOOR).length} below ${RECAP_FLOOR}, ` +
      `${rows.length - live.length} at zero.`
  );

  console.log(
    "\nNOTE: this rule fixes EMPTY boards. It does not fix boards whose tag\n" +
      "carries an over-broad keyword — `risechain` resolves to `rise-chain`,\n" +
      "whose keyword `RISE` matches \"oil prices rise\". See audit-tag-taxonomy.mjs."
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
