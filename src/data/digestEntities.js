/**
 * Which entities have a `this-week` digest.
 *
 * WHY THIS IS AN ALLOWLIST AND NOT EVERY LANDING-PAGE SLUG
 *
 * 66 boards are published; 16 are here. Density is the reason, and it was
 * measured rather than guessed: C3 found the volume cliff is steep, and a recap
 * page whose window comes back nearly empty has nothing for a reader to land on.
 * An unlisted slug gets a real 404, which is §4.1 applied literally — prefer no
 * URL over a `noindex` URL.
 *
 * TWO DIFFERENT FLOORS, AND THEY ARE NOT THE SAME NUMBER
 *
 *  - **The selection bar is 30 items/week.** Editorial, applied here, by hand,
 *    when an entity is added. It asks "is there reliably enough to say".
 *  - **The runtime floor is `DENSITY_FLOOR` (20).** Mechanical, applied per
 *    render in `server/thisWeek.ts`, and it asks "does *this* window have
 *    anything in it at all" — widening to 30 days or falling back to `noindex`
 *    when it does not.
 *
 * Conflating them would be wrong in both directions: a page that clears 30 on
 * average still has quiet weeks and needs the runtime fallback, and a page
 * averaging 22 should not exist even though every individual week clears 20.
 *
 * Three entities below sit at 25–29, under the selection bar, and are here by an
 * explicit call rather than by the rule. They are marked.
 *
 * WHY A `tag` SEPARATE FROM THE SLUG
 *
 * They are not reliably the same string, and assuming they were is finding 23.
 * `?tags=` matches a keyword bag rather than a taxonomy slug, and a board slug
 * frequently carries zero keywords while a twin of another name holds the
 * content — `polygon` has none, `matic-network` has 1,932 articles.
 *
 * `?tags=a,b` unions and de-duplicates, so **this field resolves the taxonomy
 * itself and does not wait on the backend fix** in `docs/tag-taxonomy-fix.md`.
 * That fix is what the product's dashboards need; these pages do their own
 * resolution and are unblocked by it. Verified 22 Sep 2026:
 * `?tags=risechain,rise-chain` returns the same 273 as `rise-chain` alone.
 *
 * HOW `measuredWeekly` WAS DERIVED, AND WHY IT IS NOT A LIVE 7-DAY COUNT
 *
 * News ingestion stopped 2026-09-17T10:24Z, so a trailing 7-day news count reads
 * ~0 for every entity today and would have ranked all 66 boards as dead. News is
 * the dominant feed, so dropping it was not an option either.
 *
 * So news was measured over the 30-day window and scaled by the 25.1 days that
 * window actually holds data for, giving the rate from when the pipeline was
 * healthy; every other feed is current and was measured directly at `period=1`.
 * The check that licenses the method: Bitcoin comes out at 814 news/week against
 * the 785/week C3 measured independently on 31 Aug.
 *
 * Counts are entity-specific trailing coverage — news, blogs, podcasts, video,
 * forum, DAO. Events are excluded because they are forward-looking, and exploits
 * because they are not tag-filtered and would add the same ~5 to every entity,
 * flattering the thin ones.
 *
 * TWO BOARDS THAT LOOK ELIGIBLE AND ARE NOT
 *
 *  - **`reserve`** measured 102/week and is **fuzzy-match noise**. `?tags=` is a
 *    keyword match and "reserve" is a common English word, so it collected
 *    "Federal Reserve rate increase", "proof of reserves" and "US Bitcoin Reserve
 *    Bill". Reserve Protocol's own tag, `reserve-protocol`, has 19 news items
 *    all-time and 6/week across every feed. Not a judgement call — a measurement.
 *  - **`polygon`** clears nothing at 16/week even with its tag pair resolved. Its
 *    1,933 articles are historical.
 *
 * Any future addition gets the same treatment: measure first, and be suspicious
 * of a slug that is also an ordinary word.
 */

/** The editorial bar for adding an entity. Not the runtime floor — see above. */
export const SELECTION_FLOOR = 30;

export const DIGEST_ENTITIES = [
  // ---- Assets and chains -------------------------------------------------
  { slug: "bitcoin", tag: "bitcoin", name: "Bitcoin", measuredWeekly: 907 },
  { slug: "ethereum", tag: "ethereum", name: "Ethereum", measuredWeekly: 296 },
  { slug: "xrpl", tag: "xrpl", name: "XRP Ledger", measuredWeekly: 188 },
  { slug: "solana", tag: "solana", name: "Solana", measuredWeekly: 176 },
  /*
   * 48 news a week and **36 governance-forum posts**, all real grant
   * applications — by far the highest forum share of any asset here, and the
   * clearest case in the set for a recap over a price page.
   *
   * An earlier version of this note called it "the only entity whose forum
   * outweighs its news", which its own figures contradict: 36 is less than 48.
   * `dfinity`, below, is the entity that actually does — 24 forum against 1 news.
   * Corrected because this file's authority rests on its measurements agreeing
   * with its prose.
   */
  { slug: "zcash", tag: "zcash", name: "Zcash", measuredWeekly: 111 },
  { slug: "risechain", tag: "risechain,rise-chain", name: "Rise Chain", measuredWeekly: 81 },
  { slug: "base", tag: "base", name: "Base", measuredWeekly: 70 },
  { slug: "arbitrum", tag: "arbitrum", name: "Arbitrum", measuredWeekly: 32 },
  { slug: "aave", tag: "aave", name: "Aave", measuredWeekly: 30 },
  { slug: "uniswap", tag: "uniswap", name: "Uniswap", measuredWeekly: 30 },

  // ---- Below the selection bar, included by explicit decision ------------
  /*
   * 29, 27 and 25 against a bar of 30. All three clear the runtime floor
   * comfortably, so they render a normal seven-day window; they are flagged
   * because a quiet week will put them into the widened view, and that is
   * expected behaviour here rather than a defect to chase.
   */
  { slug: "avalanche", tag: "avalanche,avalanche-2", name: "Avalanche", measuredWeekly: 29, belowBar: true },
  { slug: "optimism", tag: "optimism", name: "Optimism", measuredWeekly: 27, belowBar: true },
  /*
   * Almost entirely governance: 24 forum posts a week against 1 news item. The
   * slug is also a tag-resolution gap the documented fix cannot reach — the tag
   * is named "internet computer", so neither slug nor name matches `dfinity` —
   * making this a fourth manual pairing alongside `kyber`, `sia` and
   * `impossible`. Resolved here; still worth adding to the backend fix.
   */
  { slug: "dfinity", tag: "dfinity,internet-computer", name: "Internet Computer", measuredWeekly: 25, belowBar: true },

  // ---- Sectors and regions ----------------------------------------------
  /*
   * C3 calls sector slugs "the pleasant surprise": recap-shaped, no price
   * mechanics, and CoinMarketCap has nothing sector-level keyed to media
   * coverage. `ai` is broad — it collects general AI coverage, not only
   * crypto-AI — which is a feature for the query it answers and a thing to watch
   * if the page ever reads off-topic.
   */
  { slug: "ai", tag: "ai,ai4", name: "AI", measuredWeekly: 750 },
  { slug: "trading", tag: "trading", name: "Crypto trading", measuredWeekly: 350 },
  /*
   * The ordinary-word risk this file warns about, in a milder form than
   * `reserve` — and worth watching rather than rejecting.
   *
   * `?tags=japan` is coherent enough to keep (Japan FSA policy, Korea–Japan
   * stablecoin tests, Bank of Japan rate coverage) but it does drift: Starbucks
   * selling its Japan operations, a Waymo Tokyo robotaxi partnership. On a page
   * with 42 news a week that is a small share; on the **9 live items** the stalled
   * pipeline currently leaves, the drift is a large share of a small page.
   *
   * Re-check this one first if the tier is ever pruned, and re-check it after news
   * ingestion is restored, since the healthy-rate figure is what justifies it.
   */
  { slug: "japan", tag: "japan", name: "Japan", measuredWeekly: 44 },
];

/**
 * Every record carries the same measurement date, because they were measured in
 * one pass. Kept as one constant rather than per-entity so a partial re-check
 * cannot leave the set claiming a freshness it does not have.
 */
export const DIGEST_VERIFIED_ON = "2026-09-22";

export const digestEntityFor = (slug) =>
  DIGEST_ENTITIES.find((entity) => entity.slug === slug);

/** The paths `src/seo/indexState.ts` promotes. */
export const digestPaths = () =>
  DIGEST_ENTITIES.map((entity) => `/projects/${entity.slug}/this-week`);
