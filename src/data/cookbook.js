/**
 * `/cookbook` — one page per use case, each with code that runs and output that
 * was actually produced by running it.
 *
 * WHY "COOKBOOK" AND NOT "RECIPES"
 *
 * The strategy doc specified `/recipes/*` and argued the name was free brand
 * equity because "Recipes" is already one of the five products on the homepage.
 * That is backwards. `recipes.alphaday.com` ships today as **AlphaRecipes** —
 * personalised push alerts, configured in a UI, for app users. These pages are
 * code samples for agent builders. Same word, two artifacts, two audiences, one
 * character apart in the URL bar.
 *
 * "Cookbook" is what this audience already calls this genre, and the SEO cost of
 * the rename is close to zero: nobody searches "alphaday recipes" looking for
 * code. They search "give claude live crypto news", which the page body answers.
 * The slug was never doing the work.
 *
 * THE BAR, AND WHY IT IS EXPENSIVE
 *
 * §A1: "working code and a real, pasted output. Not tutorials in the marketing
 * sense — the smallest complete thing that does something."
 *
 * Every `output` below was produced by running the `code` above it against the
 * live API, and the running mattered every time:
 *
 *  - The DAO poller's first version crashed. `sorted()` on `(hours, dict)`
 *    tuples falls through to comparing dicts whenever two proposals share a
 *    deadline, which they routinely do. A snippet nobody executes ships that
 *    bug to every reader.
 *  - Three Arbitrum proposals looked like one duplicated row until the titles
 *    were widened. They are three distinct Snapshot votes.
 *  - `?active=true` is documented on `/items/dao/` and returns zero results,
 *    while `?active=false` returns the entire corpus. Every one of these pages
 *    would have shipped the broken parameter.
 *
 * `verifiedOn` is load-bearing for the same reason it is on the MCP client
 * pages: a sample whose output no longer matches reality is worse than no
 * sample, because it is the first thing a reader and a model will trust.
 */
import { API_COMMANDS } from "./apiSurface";

const MCP_URL = API_COMMANDS.mcpUrl;
const VERIFIED = "2026-09-15";

/**
 * Caveats that are properties of the data rather than of any one recipe.
 *
 * Keyed and selected per page, the same discipline as `ENDPOINT_ISSUES` on the
 * client pages: a caveat list repeated in full on six pages is a caveat list
 * nobody reads.
 */
export const DATA_CAVEATS = {
  "dao-active-broken": {
    title: "`?active=true` returns nothing",
    body:
      "The parameter is documented on `/items/dao/` and it does not work: `active=true` returns 0 results, `active=false` returns all 6,603. Filter on `starts_at` and `ends_at` client-side instead, which is what the code above does. Reported to the API team.",
  },
  "ecosystem-tags": {
    title: "Ecosystem tags are broader than they look",
    body:
      "`tags=ethereum` on governance returns 4,727 proposals because Alchemix, 1inch and Lido are all Ethereum DAOs. That is correct behaviour, not a bug, but it means a per-project digest reads wider than a reader expects. Filter by `sources` when you want one DAO.",
  },
  "zero-keyword-tags": {
    title: "Some tags return zero for a project that clearly has coverage",
    body:
      "`tags=lido` returns 0 governance items. A tag only matches content through its keywords, and a tag filed with none never matches anything. Check a tag returns results before building a scheduled job on it.",
  },
  "no-period-on-dao": {
    title: "`period` does not apply to governance",
    body:
      "Proposals carry `starts_at` and `ends_at` rather than `published_at`, so a `period` filter passes through without narrowing anything. Window governance on its own dates.",
  },
  "sentiment-is-per-article": {
    title: "Sentiment is per article, not per project",
    body:
      "Each news item carries `sentiment` (-2 to +2) and `sentiment_score`. There is no project-level mood field — averaging is your call, and a mean over 50 articles can read positive in a week whose single biggest story scored -2.",
  },
  "titles-truncate": {
    title: "Do not truncate titles to dedupe",
    body:
      "Three separate Arbitrum proposals shared a 52-character prefix and looked like one row repeated. Distinct items have distinct `hash` and `url` values; use those to identify, and the title only to display.",
  },
};

export const RECIPES = [
  {
    slug: "claude-crypto-news",
    title: "Give Claude live crypto news",
    query: "give claude live crypto news",
    blurb:
      "The shortest useful thing in this cookbook: one command, no code, and Claude answers from a live feed of ~50 outlets instead of from training data.",
    minutes: 2,
    stack: "No code",
    uses: ["get_news_summary", "get_trending_news"],
    steps: [
      {
        heading: "Add the server",
        body:
          "Alphaday is a remote MCP server, so there is nothing to install and no key to obtain. Claude Code takes it as one line.",
        code: `claude mcp add --transport http alphaday ${MCP_URL}`,
        language: "bash",
      },
      {
        heading: "Ask a question it cannot answer from training data",
        body:
          "The point is a question with a moving answer. Claude picks `get_news_summary` on its own and passes the project as a tag — the tool descriptions carry enough for that, so there is no prompt engineering step here.",
        code: "What happened in Ethereum this week? Use the Alphaday tools.",
        language: "text",
      },
    ],
    output: {
      code: `{
  "tags": ["ethereum"],
  "summary": "Ethereum and Base developers have abandoned their joint effort to align account abstraction proposals. Uniswap Labs stable pair hook became the highest volume pool on Ethereum. Ethereum builders face challenges between locking up cash or relying on trusted brokers amid market shifts.",
  "updated_at": "2026-09-15T06:16:31.794075+00:00"
}`,
      language: "json",
      note:
        "The literal tool result behind Claude's answer, captured on 15 Sep 2026. `updated_at` is the server's, not yours — the briefing is recomputed on the server's own schedule, so two calls minutes apart can return the same text.",
    },
    variations: [
      {
        heading: "Scope it to one outlet",
        body: "`sources` takes source slugs. The Block alone carries 14,836 indexed articles, which is enough to ask about an outlet's coverage rather than the market's.",
        code: `Summarise what The Block has published on restaking this month.`,
      },
      {
        heading: "Ask for the thing that has no summary tool",
        body: "Governance, exploits, yields and developer activity are all separate capabilities. Naming one steers the tool choice without you specifying a tool.",
        code: `Which DAO proposals close in the next three days?`,
      },
      {
        heading: "Use it from a different client",
        body: "The same server works in Cursor, VS Code, Codex, ChatGPT, Windsurf, Cline, Roo and Kilo. Each takes a different config shape, which is why they get a page each.",
        code: `codex mcp add alphaday --url ${MCP_URL}`,
      },
    ],
    caveats: ["zero-keyword-tags"],
    next: ["crypto-research-agent", "weekly-ecosystem-digest"],
  },

  {
    slug: "dao-proposal-alerts",
    title: "Alert on DAO proposals closing soon",
    query: "alert me on new DAO proposals",
    blurb:
      "Governance deadlines are the one crypto event you cannot catch up on afterwards — a vote you missed is simply gone. Forty lines and a cron entry.",
    minutes: 15,
    stack: "Python, stdlib only",
    uses: ["/items/dao/"],
    steps: [
      {
        heading: "Fetch, then filter on the dates yourself",
        body:
          "The documented `?active=true` parameter returns nothing (see below), so the window is computed from `starts_at` and `ends_at`. That turns out to be the more useful shape anyway: \"open right now\" is a weaker question than \"open right now and closing inside three days\".",
        code: `import json, urllib.request
from datetime import datetime, timezone

API = "https://api.alphaday.com/items/dao/"
CLOSING_WITHIN_HOURS = 72

def fetch(limit=100):
    with urllib.request.urlopen(f"{API}?limit={limit}") as r:
        return json.load(r)["results"]

def closing_soon(proposals):
    now = datetime.now(timezone.utc)
    out = []
    for p in proposals:
        starts = datetime.fromisoformat(p["starts_at"].replace("Z", "+00:00"))
        ends = datetime.fromisoformat(p["ends_at"].replace("Z", "+00:00"))
        if not (starts <= now <= ends):
            continue
        hours_left = (ends - now).total_seconds() / 3600
        if hours_left <= CLOSING_WITHIN_HOURS:
            out.append((hours_left, p))
    # Sort on the number alone. A bare sorted() falls through to comparing the
    # dicts whenever two proposals share a deadline, and then it raises.
    return sorted(out, key=lambda pair: pair[0])

for hours, p in closing_soon(fetch()):
    print(f"{hours:5.1f}h left  {p['source']['name']:<14} {p['title'][:52]}")`,
        language: "python",
      },
      {
        heading: "Run it on a schedule",
        body:
          "Proposals open and close continuously, so hourly is enough and daily misses short votes. Keep the `hash` of everything you have already alerted on, or you will re-send the same proposal every hour for three days.",
        code: "0 * * * * /usr/bin/python3 /opt/alerts/dao_alerts.py",
        language: "bash",
      },
    ],
    output: {
      code: ` 31.1h left  Gitcoin        [Proposal]: Upgrade the Gitcoin Governor
 63.2h left  Arbitrum DAO   Banning projects identified in the high-severity Wat
 63.2h left  Arbitrum DAO   Banning projects identified in the high-severity Wat
 63.2h left  Arbitrum DAO   Banning projects identified in the high-severity Wat
 65.3h left  Alchemix       [AIP-124] Deprecate alUSD and alETH Bridging + Wind
 65.3h left  Alchemix       [AIP-125] Launch on Base`,
      language: "text",
      note:
        "Actual output, 15 Sep 2026. Those three Arbitrum rows are not a bug and not duplicates — they are three separate Snapshot proposals whose titles share a 52-character prefix. Widen the column or print the `url`; identify on `hash`, never on the title.",
    },
    variations: [
      {
        heading: "Watch one DAO instead of all of them",
        body: "`tags=arbitrum` pulls the whole Ethereum-adjacent ecosystem. `sources=arbitrum_dao` returns the 171 proposals that are actually Arbitrum's.",
        code: `API + "?sources=arbitrum_dao&limit=100"`,
      },
      {
        heading: "Alert on opening, not closing",
        body: "Flip the window to `starts_at` within the last hour and you get a feed of proposals as they go live — better for a delegate who wants to read early than for a voter who wants a deadline.",
        code: `if (now - starts).total_seconds() <= 3600:
    notify(p)`,
      },
      {
        heading: "Post it somewhere",
        body: "The alert list is plain text, so any webhook takes it. A Discord channel is the usual destination, and that is its own recipe.",
        code: `urllib.request.urlopen(urllib.request.Request(
    WEBHOOK_URL,
    data=json.dumps({"content": line}).encode(),
    headers={"Content-Type": "application/json"}))`,
      },
    ],
    caveats: ["dao-active-broken", "titles-truncate", "no-period-on-dao"],
    next: ["weekly-ecosystem-digest", "discord-bot-crypto-data"],
  },

  {
    slug: "crypto-research-agent",
    title: "Build a crypto research agent",
    query: "build a crypto research agent",
    blurb:
      "Let the data choose the subject. Read what is trending, then pull every feed that mentions it into one brief — the loop that finds stories nobody told you to look for.",
    minutes: 30,
    stack: "Python, stdlib only",
    uses: ["/keywords/trending/", "/items/news/", "/items/blogs/", "/items/podcasts/", "/items/dao/"],
    steps: [
      {
        heading: "Start from trending, not from a watchlist",
        body:
          "A watchlist can only return what you already track. `/keywords/trending/` returns what the corpus is actually talking about, each entry carrying a `trendiness` figure, a `sentiment_score` and — the part that makes this composable — the `tag` slug every other feed accepts.",
        code: `import json, urllib.request
from urllib.parse import urlencode
BASE = "https://api.alphaday.com"

def get(path, **p):
    with urllib.request.urlopen(f"{BASE}{path}?{urlencode(p)}") as r:
        return json.load(r)

top = get("/keywords/trending/", limit=3)["results"]
for k in top:
    tag  = k["keyword"]["tag"]["slug"]
    name = k["keyword"]["name"]
    print(f"\\n{'='*64}\\n{name}  (trendiness {k['trendiness']}, sentiment {k['sentiment_score']})")
    for feed, path in (("news", "/items/news/"), ("blogs", "/items/blogs/"),
                       ("podcasts", "/items/podcasts/"), ("governance", "/items/dao/")):
        d = get(path, tags=tag, period=1, limit=2)
        titles = [r["title"][:52] for r in d["results"]]
        print(f"  {feed:11} {d['total']:>6} items   {titles[0] if titles else '—'}")`,
        language: "python",
      },
      {
        heading: "Hand the assembled context to a model",
        body:
          "Everything above is retrieval, and it is deliberately the whole program: the agent's judgement is worth having only once the context is real. Pass the assembled rows to your model of choice, or skip the plumbing entirely and connect the MCP server so the model runs these calls itself.",
        code: `claude mcp add --transport http alphaday ${MCP_URL}`,
        language: "bash",
      },
    ],
    output: {
      code: `================================================================
Ethereum  (trendiness 0.63, sentiment 0.04)
  news           221 items   Ethereum and Base abandon joint account abstraction
  blogs            1 items   Join Us: EF Protocol Reddit AMA - September 16th, 20
  podcasts        20 items   THE CLARITY ACT IS IN TROUBLE! DEMOCRATS REJECT NEW
  governance    4727 items   [AIP-125] Launch on Base

================================================================
Balancer  (trendiness 0.59, sentiment -0.18)
  news             6 items   Balancer wind-down proposed as post-exploit revenue
  blogs            0 items   —
  podcasts         1 items   Ethereum And Base Split On Account Abstaction
  governance    1184 items   [BIP-926] Treasury Council Resignation: Xeonus, Succ

================================================================
Bitcoin  (trendiness 0.59, sentiment 0.11)
  news           750 items   A Fake Tesco Casino Is Still Live and Ranking First
  blogs           31 items   Swiss Bitcoin Pay Shuts Down Servers After Data Brea
  podcasts        31 items   Trustless Swaps Across Bitcoin Layers | Walter Maffi
  governance     171 items   [1IP-105] Aqua LP Incentive Program`,
      language: "text",
      note:
        "Actual output, 15 Sep 2026 — and a demonstration of why the loop is worth running. Nobody asked about Balancer. It surfaced on its own at -0.18 sentiment, with six news items about a post-exploit wind-down and a governance proposal titled \"Treasury Council Resignation\". That is a story assembled from three feeds by a program that had no watchlist.",
    },
    variations: [
      {
        heading: "Widen the window",
        body: "`period` takes 0 for the last 24 hours, 1 for a week, 2 for a month, 3 for a quarter. A month of Ethereum news is 1,024 articles — enough to ask what changed rather than what happened.",
        code: `get("/items/news/", tags="ethereum", period=2, limit=50)`,
      },
      {
        heading: "Search instead of tagging",
        body: "`search` runs over the text rather than the tag graph, which catches narratives that have no tag yet. \"restaking\" returns 547 articles and is not a project.",
        code: `get("/items/news/", search="restaking", period=1, limit=20)`,
      },
      {
        heading: "Pin the agent to security",
        body: "Swap the trending seed for the exploit feed and the same loop becomes an incident monitor — 180+ written incident records, each with its own detail endpoint.",
        code: `get("/items/security-exploits/", limit=5)`,
      },
    ],
    caveats: ["ecosystem-tags", "no-period-on-dao", "zero-keyword-tags"],
    next: ["weekly-ecosystem-digest", "sentiment-from-podcasts"],
  },

  {
    slug: "discord-bot-crypto-data",
    title: "Crypto data for a Discord bot",
    query: "crypto data for a discord bot",
    blurb:
      "A slash command that answers from a live feed. The data half is four lines; the rest is Discord's embed format, which is the part people actually get stuck on.",
    minutes: 20,
    stack: "Python, discord.py",
    uses: ["/items/news/trending/", "/items/news/"],
    steps: [
      {
        heading: "The data call",
        body:
          "No key, no auth header, no signup — which is what makes this viable for a community bot that might be installed in a hundred servers before anyone thinks about quotas.",
        code: `curl "https://api.alphaday.com/items/news/trending/?limit=3"`,
        language: "bash",
      },
      {
        heading: "The slash command",
        body:
          "Sentiment maps cleanly onto Discord's embed colour, which is the whole reason this reads better than a link dump: the channel sees the mood before it reads the headline.",
        code: `import discord, aiohttp
from discord import app_commands

API = "https://api.alphaday.com/items/news/"
COLOURS = {2: 0x2ecc71, 1: 0x87d37c, 0: 0x95a5a6, -1: 0xe6a23c, -2: 0xe74c3c}

client = discord.Client(intents=discord.Intents.default())
tree = app_commands.CommandTree(client)

@tree.command(name="crypto", description="Latest news for a project")
async def crypto(interaction: discord.Interaction, project: str = ""):
    params = {"limit": 3, **({"tags": project} if project else {})}
    async with aiohttp.ClientSession() as s:
        async with s.get(API, params=params) as r:
            items = (await r.json())["results"]

    if not items:
        # A tag with no keywords matches nothing. Say so, rather than
        # rendering an empty embed that looks like the bot is broken.
        await interaction.response.send_message(
            f"No tagged coverage for \`{project}\`.", ephemeral=True)
        return

    embeds = [
        discord.Embed(
            title=i["title"][:256],
            url=i["url"],
            colour=COLOURS.get(i.get("sentiment"), 0x95a5a6),
        ).set_footer(text=f"{i['source']['name']} · sentiment {i['sentiment_score']}")
        for i in items
    ]
    await interaction.response.send_message(embeds=embeds)`,
        language: "python",
      },
    ],
    output: {
      code: `$ curl -s "https://api.alphaday.com/items/news/?tags=ethereum&limit=3"

  sentiment=-2  score=-0.74  Ethereum and Base abandon joint account abstraction standard
  sentiment= 1  score= 0.46  BitMine Buys $68M in Ethereum, Nears 6 Million ETH
  sentiment= 1  score= 0.10  Bitcoin options lead $16.6B Q3 crypto expiry

  -> renders as three embeds: one red, two green`,
      language: "text",
      language_note: true,
      note:
        "The live response behind the command, 15 Sep 2026. `sentiment` is the integer that picks the colour; `sentiment_score` is the decimal shown in the footer. Note the third row: a Bitcoin options headline came back under `tags=ethereum`, because one article legitimately carries several project tags.",
    },
    variations: [
      {
        heading: "Trending instead of latest",
        body: "`/items/news/trending/` ranks by engagement across the corpus rather than by recency. Better for a `/whatsup` command that should return something interesting rather than something new.",
        code: `API = "https://api.alphaday.com/items/news/trending/"`,
      },
      {
        heading: "A governance channel",
        body: "Point the same embed builder at `/items/dao/` and colour by time remaining instead of sentiment. Proposals carry `ends_at`, which is the field that makes urgency renderable.",
        code: `async with s.get("https://api.alphaday.com/items/dao/",
                 params={"sources": "arbitrum_dao", "limit": 5}) as r:`,
      },
      {
        heading: "Autocomplete the project argument",
        body: "The tag taxonomy is queryable, so the `project` argument can autocomplete against real slugs rather than letting users guess — which is what produces the empty result the code above has to handle.",
        code: `await s.get("https://api.alphaday.com/tags/", params={"search": current})`,
      },
    ],
    caveats: ["zero-keyword-tags", "sentiment-is-per-article"],
    next: ["dao-proposal-alerts", "claude-crypto-news"],
  },

  {
    slug: "weekly-ecosystem-digest",
    title: "Automate a weekly ecosystem digest",
    query: "automate a crypto newsletter",
    blurb:
      "Three feeds, one markdown file, no writing. The AI briefing does the prose; news and governance supply the evidence under it.",
    minutes: 25,
    stack: "Python, stdlib only",
    uses: ["/items/news/summary/", "/items/news/", "/items/dao/"],
    steps: [
      {
        heading: "Compose the three calls",
        body:
          "`/items/news/summary/` returns written prose rather than rows, which is what makes this a digest instead of a list. The headlines below it are the receipts — a briefing nobody can check is a briefing nobody trusts.",
        code: `import json, urllib.request
from urllib.parse import urlencode
BASE = "https://api.alphaday.com"

def get(path, **params):
    with urllib.request.urlopen(f"{BASE}{path}?{urlencode(params)}") as r:
        return json.load(r)

def digest(tag, period=1):           # period 1 = LAST_WEEK
    news    = get("/items/news/", tags=tag, period=period, limit=5)["results"]
    summary = get("/items/news/summary/", tags=tag)
    dao     = get("/items/dao/", tags=tag, limit=20)["results"]
    return news, summary, dao

news, summary, dao = digest("ethereum")
print(f"# Ethereum — week in review\\n")
print(summary.get("summary", "(no summary)"), "\\n")
print(f"## Headlines ({len(news)})")
for n in news:
    mood = {2: "++", 1: "+", 0: "0", -1: "-", -2: "--"}.get(n.get("sentiment"), "?")
    print(f"- [{mood:>2}] {n['title'][:66]}  ({n['source']['name']})")
print(f"\\n## Governance ({len(dao)} proposals)")
for d in dao[:4]:
    print(f"- {d['title'][:62]}  ends {d['ends_at'][:10]}")`,
        language: "python",
      },
    ],
    output: {
      code: `# Ethereum — week in review

Ethereum and Base developers have abandoned their joint effort to align account
abstraction proposals. Uniswap Labs stable pair hook became the highest volume
pool on Ethereum. Ethereum builders face challenges between locking up cash or
relying on trusted brokers amid market shifts.

## Headlines (5)
- [--] Ethereum and Base abandon joint account abstraction standard  (Crypto.news)
- [ +] BitMine Buys $68M in Ethereum, Nears 6 Million ETH  (Contribune)
- [ +] Bitcoin options lead $16.6B Q3 crypto expiry  (Crypto.news)
- [++] Uniswap Labs' stable pair hook becomes highest volume pool on Ethe  (CryptoBriefing)
- [ -] Ethereum, Base developers abandon effort to align account abstract  (The Block)

## Governance (20 proposals)
- [AIP-125] Launch on Base  ends 2026-09-17
- [AIP-124] Deprecate alUSD and alETH Bridging + Wind Down v3 on  ends 2026-09-17
- [1IP-106] Establish the 1inch DAO Security Council and Ratify   ends 2026-09-19
- Authorize a Contingent LDO CEX Liquidity Market-Making Mandate  ends 2026-09-21`,
      language: "markdown",
      note:
        "Actual output, 15 Sep 2026. Two honest details: the same account-abstraction story appears twice from different outlets, because deduping across ~50 sources is your job and not the API's; and the governance section lists Alchemix, 1inch and Lido proposals under an Ethereum digest, because those are Ethereum DAOs.",
    },
    variations: [
      {
        heading: "Monthly instead of weekly",
        body: "`period=2` widens to a month — 1,024 Ethereum articles rather than a week's handful. The AI summary is recomputed server-side and does not take a period, so only the evidence section widens.",
        code: `news, summary, dao = digest("ethereum", period=2)`,
      },
      {
        heading: "One digest per DAO",
        body: "Scope governance with `sources` rather than `tags` and the section stops reporting the whole Ethereum ecosystem under one project's name.",
        code: `dao = get("/items/dao/", sources="arbitrum_dao", limit=20)["results"]`,
      },
      {
        heading: "Dedupe the headlines",
        body: "The same story arrives from several of the ~50 outlets. Group on a normalised title before printing, or the digest reads like it is stuttering — as the output above does.",
        code: `seen = set()
news = [n for n in news
        if not (k := n["title"].lower()[:40]) in seen and not seen.add(k)]`,
      },
    ],
    caveats: ["ecosystem-tags", "no-period-on-dao", "sentiment-is-per-article"],
    next: ["sentiment-from-podcasts", "dao-proposal-alerts"],
  },

  {
    slug: "sentiment-from-podcasts",
    title: "Analyse crypto podcasts programmatically",
    query: "analyse crypto podcasts programmatically",
    blurb:
      "118 podcast feeds, tagged by project, each episode carrying a written description. Enough to track what the circuit is saying without transcribing a single minute of audio.",
    minutes: 25,
    stack: "Python, stdlib only",
    uses: ["/items/podcasts/", "/items/news/"],
    steps: [
      {
        heading: "Be clear about what the API gives you",
        body:
          "News items carry a computed `sentiment` and `sentiment_score`. **Podcast episodes do not.** What they carry is `short_description` — a real paragraph, not a truncated title — which is enough to classify against without audio. Anything calling itself podcast sentiment is doing a model pass on that text, and this recipe shows the seam rather than hiding it.",
        code: `import json, urllib.request, statistics
from urllib.parse import urlencode
BASE = "https://api.alphaday.com"

def get(path, **p):
    with urllib.request.urlopen(f"{BASE}{path}?{urlencode(p)}") as r:
        return json.load(r)

TAG = "ethereum"
pods = get("/items/podcasts/", tags=TAG, period=1, limit=8)   # 1 = LAST_WEEK
news = get("/items/news/", tags=TAG, period=1, limit=50)["results"]

# The news half needs no model — the scores are already on the rows.
scores = [float(n["sentiment_score"]) for n in news if n.get("sentiment_score") is not None]
print(f"news sentiment over {len(scores)} articles this week: "
      f"mean {statistics.mean(scores):+.2f}, median {statistics.median(scores):+.2f}")
print(f"podcast episodes mentioning {TAG} this week: {pods['total']}\\n")

print("Episodes to feed an LLM (title + description, no transcript needed):")
for p in pods["results"][:5]:
    desc = (p.get("short_description") or "").strip().replace("\\n", " ")
    print(f"- {p['source']['name']}: {p['title'][:58]}")
    print(f"    {desc[:96]}...")`,
        language: "python",
      },
      {
        heading: "Classify the descriptions",
        body:
          "Pass the titles and descriptions to a model in one batched call and ask for a label per episode. Batching matters: five separate calls cost five times as much and give the model no way to calibrate one episode against another.",
        code: "Classify each episode's stance on Ethereum as bullish, bearish or neutral.\nReturn one JSON object per episode with the title and a one-line reason.",
        language: "text",
      },
    ],
    output: {
      code: `news sentiment over 50 articles this week: mean +0.32, median +0.43
podcast episodes mentioning ethereum this week: 20

Episodes to feed an LLM (title + description, no transcript needed):
- Thinking Crypto News & Interviews: THE CLARITY ACT IS IN TROUBLE! DEMOCRATS REJECT NEW CRYPTO
    Crypto News: Democrats reject the Republicans new Clarity Act draft bil but are sending over a c...
- ETH Daily - Ethereum News: Ethereum And Base Split On Account Abstaction
    Ethereum core developers and Base to ship different account abstraction standard. Balancer gover...
- Milk Road Radio: Dan Tapiero: Crypto Is Entering a Much Bigger Bull Market
    Dan Tapiero, founder and CEO of 50T Funds, joins the show to explain why he believes the crypto ...
- Bankless Podcast: Crypto is Ready for Onchain Options | Nick Forster, CEO of
    Getting the direction of ETH right doesnt guarantee you survive the trade. Derive co-founder Nic...
- Thinking Crypto News & Interviews: HUGE CLARITY ACT NEWS! DEMOCRATS MEET TO DISCUSS CRYPTO BI
    Crypto News: Democrats reject the Republicans new Clarity Act draft bil but are sending over a c...`,
      language: "text",
      note:
        "Actual output, 15 Sep 2026. The mean of +0.32 is the number to be careful with: the single largest Ethereum story that week scored -2, and averaging it against 49 quieter items produces a reading of mild optimism that no human following the story would recognise. Weight by recency or by outlet, or report the distribution rather than the mean.",
    },
    variations: [
      {
        heading: "Follow one show",
        body: "`sources` scopes to a single feed — Bankless alone has 1,393 indexed episodes, which is enough to track one show's stance over time rather than the circuit's.",
        code: `get("/items/podcasts/", sources="bankless_podcast", period=1, limit=20)`,
      },
      {
        heading: "Report the distribution, not the mean",
        body: "The mean hides the story. Counting the buckets keeps the -2 visible instead of averaging it into mild optimism.",
        code: `from collections import Counter
print(Counter(n["sentiment"] for n in news))`,
      },
      {
        heading: "Cross-check against video",
        body: "121 YouTube channels are indexed the same way and take the same filters, so the same script runs over a second medium by changing one path.",
        code: `get("/items/videos/", tags=TAG, period=1, limit=8)`,
      },
    ],
    caveats: ["sentiment-is-per-article", "zero-keyword-tags"],
    next: ["crypto-research-agent", "weekly-ecosystem-digest"],
  },
];

/** Lookup by slug, for the `/cookbook/$recipe` route. */
export const recipeBySlug = (slug) => RECIPES.find((r) => r.slug === slug);

/** The caveats a recipe selects, in a stable order across pages. */
export const caveatsFor = (recipe) =>
  Object.entries(DATA_CAVEATS)
    .filter(([id]) => recipe.caveats.includes(id))
    .map(([id, caveat]) => ({ id, ...caveat }));

/** Resolved `next` records, skipping any slug that no longer exists. */
export const nextFor = (recipe) =>
  recipe.next.map(recipeBySlug).filter(Boolean);

export const RECIPES_VERIFIED_ON = VERIFIED;
