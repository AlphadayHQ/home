# Board tag resolution: one rule, three manual rows

**Type:** Backend / data — the rule can live in the API or on the landing-page record. Not fixable in `home`.
**Filed:** 10 Sep 2026 · **Rewritten:** 13 Sep 2026
**Measured against:** `api.alphaday.com` live, 17,403 tags enumerated via `/tags/` (13 Sep)
**Fixes:** 15 board dashboards rendering empty feeds in production, finding 23

---

## Summary

14 of 66 board dashboards render an empty feed. The cause is not a missing slug — it is a
**duplicate tag**, one of which has no keywords:

| tag | keywords | articles |
| --- | --- | --- |
| `polygon` | *(none)* | **0** |
| `matic-network` | `MATIC`, `Polygon` | 1,932 |

The board asks for `polygon` — its own slug — and gets the empty twin. 860 of 17,363 tags are in
that keyword-less state (measured 10 Sep), and 335 of those shadow a working twin of the same name.

**The fix does not require merging any of them.** A keyword-less tag returns zero items, so it costs
nothing to include. Query both and the problem disappears.

---

## The rule

> **Resolve a board to the tag whose slug is the board slug, *plus* every tag whose name is the board
> slug. Query them together.**

`/items/news/?tags=a,b` unions and de-duplicates — verified: `ethereum,solana` returns 38,601, not
the 40,407 sum.

```
board "polygon"
  slug match  → polygon          (0 items)
  name match  → matic-network    (1,932 items)   ← tag named "polygon"
  query       → ?tags=polygon,matic-network → 1,933
```

Two properties make this the right shape:

**It is strictly additive.** Today's behaviour is the first half of the union, so no working board
can regress. Measured across all 66 on 13 Sep 2026: **18 improved, 48 unchanged, 0 regressed**, and **no board resolves to zero** except the two that should.

**It needs no judgement call.** The earlier proposal — a hand-written map — had to decide which twin
was real, and the natural heuristic ("pick the tag with more articles") picked wrong twice. This rule
takes both and lets the empty one contribute nothing.

### What it fixes

| Board | Before | After | Resolved set |
| --- | --- | --- | --- |
| `avalanche` | 0 | 2,000 | `avalanche`, `avalanche-2` |
| `polygon` | 0 | 1,933 | `polygon`, `matic-network` |
| `risechain` | 0 | 1,515 | `rise-chain` — ⚠️ see *Known gap* |
| `vitalikbuterin` | 0 | 1,446 | `vitalik-buterin` |
| `worldcoin` | 0 | 981 | `worldcoin`, `worldcoin-org` |
| `injective` | 0 | 762 | `injective`, `injective-protocol` |
| `liquidstaking` | 0 | 270 | `liquid-staking` |
| `ethereumclassic` | 0 | 142 | `ethereum-classic`, `ethereum_classic` |
| `thegraph` | 0 | 105 | `the-graph` |
| `plasma` | 18 | 101 | `plasma`, `plasma-xpl` |
| `metis` | 0 | 35 | `metis`, `metis-token` |
| `rocketpool` | 0 | 27 | `rocket-pool` |
| `kyber` | 0 | 21 | `kyber-network` *(manual pairing)* |
| `rootstock` | 1 | 14 | `rootstock`, `rootstock_rsk` |
| `sia` | 0 | 11 | `siacoin` *(manual pairing)* |
| `solana-break-point` | 0 | 3 | `solanabreakpoint` |
| `impossible` | 0 | 1 | `impossible-finance` *(manual pairing)* |
| `ai` | 22,151 | 22,152 | `ai`, `ai4` |

`plasma`, `rootstock` and `solana-break-point` were not in the original list of 14. The rule found
them; a hand-written map would not have.

---

> **A fourth manual row, found 22 Sep 2026 while sizing the digest tier.**
>
> | Board | Tag | Why the rule misses it |
> | --- | --- | --- |
> | `dfinity` | `internet-computer` | The tag is named "internet computer" — it matches neither the board slug nor, after normalisation, the board name |
>
> Measured: `?tags=dfinity` returns **20** news items all-time; `?tags=internet-computer` returns
> **367**. Same shape as `kyber`/`sia`/`impossible` — a board using the short name where the taxonomy
> uses the full one — so it belongs in `MANUAL` in
> [audit-tag-resolution.mjs](../scripts/audit-tag-resolution.mjs) and in the deployed rule.
>
> It does not change the "18 improved" figure above, which was measured before this was found, and it
> does not block the digest tier: `src/data/digestEntities.js` carries the resolved set itself.

## The three manual rows

The rule cannot reach a board whose short name differs from the tag's full name. Nothing matches, so
there is nothing to union. These need pairing by hand:

| Board | Tag | Tag is named | Articles |
| --- | --- | --- | --- |
| `kyber` | `kyber-network` | "kyber network" | 21 |
| `sia` | `siacoin` | "siacoin" | 11 |
| `impossible` | `impossible-finance` | "impossible finance" | 1 |

Three rows is the entire manual surface of this fix, and that is the argument for the rule over the
fourteen-row map this document originally proposed.

`beginner` (an audience category) and `kasandra` (Alphaday's own AI) are correctly empty and are not
defects.

---

## Two rules that were tested and rejected

Both look reasonable and both are worse. Recording them so they are not re-proposed.

### Matching on keywords as well — rejected

Tags carry keywords, so matching a board against those too is the obvious extension. It rescues
`kyber` (0 → 21) and would remove one manual row.

It also takes **`base` from 1,859 to 8,215 items**, because the `coinbase` tag lists `base` among its
keywords. The Base board — featured on the home page — would fill with Coinbase coverage. Trading a
4.4× flood on a featured board for one manual row is not a good trade.

### Substring matching instead of equality — rejected

`contains` rather than `equals` pulls **50 tags for `polygon`** — `apeswap_polygon`,
`curve_polygon_pos`, `dooar-polygon`, every DEX deployment on the chain — to add 37 items. It is not
catastrophic, but the set stops being explainable and grows on its own as tags are added. Exact
equality keeps nearly all the benefit and stays bounded.

---

## Known gap: this fixes empty boards, not junk-filled ones

`risechain` resolves to `rise-chain`, which returns 1,515 items on the strength of a single keyword,
`RISE`:

```
- South Korea sees sharp rise in crypto gifts to children before 2027 tax rules
- 3 Days of Losses: Dow, S&P, Nasdaq Slide as Yields, Oil Rise
- US government bond yields rise to three-year high
```

That is the second, separate defect: **91 tags carry an over-broad keyword** — a common English word
or a two-letter ticker matching bare. `base` is the live example (`Iran missile strikes … target US
base`, `Moon bases`), and it is the urgent one because the board is featured.

The resolution rule does not address this and is not blocked by it. Single common words and short
tickers should require a disambiguating co-occurrence rather than matching alone. Tracked separately;
`audit-tag-taxonomy.mjs` lists all 91.

---

## What we are asking for

**1 · Implement the rule.** Either the API resolves a board to its tag set, or the resolved list
ships on the landing-page record. It cannot be done in `home` — deriving it needs the full 17,400-tag
taxonomy, which is 35 paginated requests and not viable per render.

**2 · Add the three manual pairings** above.

**3 · Make it a list, not a field.** Whatever carries the answer must hold *multiple* tags —
`["polygon", "matic-network"]`. A single-tag field reintroduces the pick-a-winner problem the rule
exists to avoid. The `/ui/landing-pages/{slug}/` payload has no tag field at all today
([`landingPages.ts:96-110`](../src/server/landingPages.ts#L96-L110)).

**Optional, not blocking:** merging the 335 shadowed duplicates is still worth doing as cleanup, but
the rule makes them harmless, so it is no longer a prerequisite for anything.

---

## Verification

```bash
# The rule: per-board before/after, regression check, recap sizing
node --env-file-if-exists=.env.local scripts/audit-tag-resolution.mjs

# The taxonomy defects behind it: 860 / 335 / 91
node --env-file-if-exists=.env.local scripts/audit-tag-taxonomy.mjs
```

Acceptance: no published board resolves to zero items except `beginner` and `kasandra`; no board
returns fewer items than it does today.

**Verified 13 Sep 2026** against 17,403 live tags and all 66 published boards: 18 improved,
0 regressed, and the only boards resolving to zero are `beginner` and `kasandra`, which should.

**C3 recap tier under the rule: 12 of 66 boards** clear 20 news items a week — 6 over 100/wk, 6
between 20 and 100, 24 below 20, 30 at zero. That is down from 13 under the old mapping, because the
phantom volume from `world` (5,191) and the noisy `rise-chain` no longer inflates the count. The tier
is now just below this document's own "expect 15-30 entities" estimate, and the trend across four
measurements is consistently downward. Worth settling before the tier is committed to.

One caveat on the tooling rather than the rule: the first run reported `ethereum` as
`null -> 27,194`, which was a transient API failure on the *before* query being compared as zero.
`audit-tag-resolution.mjs` now retries and then throws rather than counting a failed measurement as
an improvement. `api.alphaday.com` drops connections in bursts, so the script may need a second run.

---

## Corrections this supersedes

- The diagnosis in [seo-content-strategy.md §14](./seo-content-strategy.md#14-corrections-to-the-companion-document)
  — that the taxonomy "uses a different slug" — is incomplete. The board slug usually *does* exist as
  a tag; it is simply empty.
- §14's *"Worldcoin alone hides 5,173 articles under `world`"* is **wrong**. The `world` tag's only
  keyword is the word "world", so it collects the FIFA World Cup, the Ironman World Championship and
  Apple Watch reviews. Worldcoin's real coverage is 981 items under `worldcoin-org`. Note the rule
  reaches that set automatically and never considers `world` — the tag is named `world`, the board is
  `worldcoin`, and they do not match.
- An earlier version of this document proposed a fourteen-row mapping table. Two of its rows were
  wrong (`worldcoin` → `world`, `metis` → `metisdao`) and one was unresolvable, because the recovery
  heuristic picked the highest-volume candidate. The rule replaces it.
