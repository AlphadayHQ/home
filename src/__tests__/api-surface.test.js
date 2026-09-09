import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { API_COMMANDS, API_TOOLS, HOME_TOOLS } from "../data/apiSurface";
import mcp from "../api/mcp-tools.generated.json";
import spec from "../api/docs-spec.generated.json";

/**
 * `src/data/apiSurface.js` is hand-written copy about a machine-generated API,
 * and it drifted: all four curl commands were broken and one tool name did not
 * exist (Appendix B finding 22). Both generated artifacts are committed, so the
 * drift is detectable offline — no network, no flake.
 */

const specPaths = new Set(
  spec.categories.flatMap((category) =>
    category.endpoints.map((endpoint) => endpoint.path)
  )
);

// Live, working, but absent from the generated OpenAPI document. Allowlisted
// so the test does not report them as typos — and enumerated so that adding a
// new undocumented path is a deliberate act.
const LIVE_BUT_UNDOCUMENTED = new Set(["/search/", "/get-started/", "/mcp"]);

const urlsIn = (command) => command.match(/https:\/\/[^\s"]+/g) ?? [];
const pathOf = (url) => new URL(url).pathname;

describe("API_COMMANDS", () => {
  const commands = Object.entries(API_COMMANDS);

  it("points every command at a path the API actually serves", () => {
    for (const [key, value] of commands) {
      for (const url of urlsIn(value)) {
        const path = pathOf(url);
        expect(
          specPaths.has(path) || LIVE_BUT_UNDOCUMENTED.has(path),
          `${key}: ${path} is neither in the generated spec nor allowlisted`
        ).toBe(true);
      }
    }
  });

  it("ends every collection path with a trailing slash", () => {
    // The specific bug that made two of these print nothing: the API answers
    // 301 without it, so a pasted command emits no output and reads as a
    // broken API rather than a wrong URL.
    for (const [key, value] of commands) {
      for (const url of urlsIn(value)) {
        const path = pathOf(url);
        if (path === "/mcp") continue; // JSON-RPC endpoint, not a collection
        expect(path.endsWith("/"), `${key}: ${path} needs a trailing slash`).toBe(
          true
        );
      }
    }
  });
});

describe("API_TOOLS", () => {
  const liveNames = new Set(mcp.tools.map((tool) => tool.name));

  it("names only tools the live MCP server exposes", () => {
    for (const tool of API_TOOLS) {
      expect(liveNames.has(tool.name), `${tool.name} is not a live MCP tool`).toBe(
        true
      );
    }
  });

  it("resolves every home-page tool", () => {
    // HOME_TOOLS maps names through API_TOOLS and yields undefined on a
    // mismatch, which renders as a blank card rather than throwing.
    expect(HOME_TOOLS.every(Boolean)).toBe(true);
    expect(HOME_TOOLS).toHaveLength(6);
  });
});

describe("no hardcoded API URLs outside apiSurface.js", () => {
  // The trending command stayed broken after the shared copy was fixed,
  // because /api hardcoded the desktop variant while the mobile variant read
  // from API_COMMANDS. The two disagreed on the same screen. A single source
  // of truth only works if nothing routes around it.
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      return entry.isDirectory()
        ? walk(full)
        : /\.(jsx?|tsx?)$/.test(entry.name)
          ? [full]
          : [];
    });

  // Live and checked, but not a command users copy.
  const ALLOWED = new Set(["https://api.alphaday.com/docs/"]);
  const shared = new Set(Object.values(API_COMMANDS).flatMap(urlsIn));

  it("routes every api.alphaday.com URL through API_COMMANDS", () => {
    const offenders = [];
    for (const file of [...walk("src/pages"), ...walk("src/components")]) {
      const text = readFileSync(file, "utf8");
      for (const [i, line] of text.split("\n").entries()) {
        if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) continue;
        for (const url of line.match(/https:\/\/api\.alphaday\.com[^\s"'`<)]*/g) ?? []) {
          if (!ALLOWED.has(url) && !shared.has(url)) {
            offenders.push(`${file}:${i + 1} ${url}`);
          }
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
