import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { Asset, RouterContextProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";
import { Route as RootRoute } from "../routes/__root";
import { canonicalFor, jsonForScript, seoHead } from "../seo/head";

/**
 * JSON-LD carries post titles, excerpts, DAO names and event locations, most
 * of which the team did not write. `JSON.stringify` leaves `</script>` intact,
 * and TanStack writes a route's script children into the server HTML
 * unescaped, so a title could end the JSON-LD block and start a script of its
 * own (security audit, finding 3).
 */
const HOSTILE = [
  'Pwned </script><script>alert(document.domain)</script>',
  "Shouting </SCRIPT ><img src=x onerror=alert(1)>",
  "Comment <!-- <script> trick",
  "Ampersand & friends > all",
  "Line\u2028and\u2029paragraph separators",
];

const router = createRouter({ routeTree });

/** Render a head script the way the page does: through TanStack's `Asset`. */
const renderScript = (tag: Record<string, string>): string => {
  const { children, ...attrs } = tag;
  return renderToStaticMarkup(
    createElement(
      RouterContextProvider,
      { router } as never,
      createElement(Asset, { tag: "script", attrs, children } as never),
    ),
  );
};

const headFor = (headline: string) =>
  seoHead({
    index: true,
    title: "Exploit",
    description: "Exploit",
    canonical: canonicalFor("/security/exploits/x"),
    jsonLd: [{ "@type": "Article", headline }],
  });

describe("JSON-LD in the page head", () => {
  it.each(HOSTILE)("keeps %j inside a single script element", (headline) => {
    const html = renderScript(headFor(headline).scripts[0]);

    expect(html.match(/<script/gi)).toHaveLength(1);
    expect(html.match(/<\/script/gi)).toHaveLength(1);
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(html.endsWith("</script>")).toBe(true);
  });

  it.each(HOSTILE)("still parses back to %j", (headline) => {
    const ld = JSON.parse(headFor(headline).scripts[0].children);
    expect(ld["@graph"][0].headline).toBe(headline);
  });

  it("escapes every character that can end a script or break a line", () => {
    expect(jsonForScript({ s: "<>&\u2028\u2029" })).toBe(
      '{"s":"\\u003c\\u003e\\u0026\\u2028\\u2029"}',
    );
  });

  it("escapes the root route's site graph too", () => {
    const head = RootRoute.options.head?.({} as never) as {
      scripts: Array<Record<string, string>>;
    };
    const [script] = head.scripts;
    expect(script.type).toBe("application/ld+json");
    expect(script.children).toBe(jsonForScript(JSON.parse(script.children)));
  });

  /*
   * The fix holds only while every JSON-LD block goes through `jsonLdScript`.
   * A route that builds its own `{ type: "application/ld+json", children:
   * JSON.stringify(...) }` would reopen the hole, so only `seo/head.ts` may
   * name the type.
   */
  it("is only built in seo/head.ts", () => {
    const src = join(__dirname, "..");
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return name === "__tests__" ? [] : walk(path);
        return /\.[jt]sx?$/.test(name) ? [path] : [];
      });

    const builders = walk(src)
      .filter((path) => readFileSync(path, "utf8").includes("application/ld+json"))
      .map((path) => relative(src, path));
    expect(builders).toEqual(["seo/head.ts"]);
  });
});
