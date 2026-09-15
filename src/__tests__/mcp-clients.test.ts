import { describe, expect, it } from "vitest";
import { MCP_CLIENTS } from "../data/mcpClients";
import {
  CLIENT_GUIDES,
  ENDPOINT_ISSUES,
  endpointIssuesFor,
} from "../data/mcpClientGuides";

/**
 * The two halves of a client record must stay in step.
 *
 * `mcpClients.js` holds identity and install commands; `mcpClientGuides.js`
 * holds everything only `/mcp/{client}` renders. They are separate files
 * because `/api` and `/mcp` import the first and would otherwise ship 9 KB
 * gzipped of troubleshooting copy they never display.
 *
 * The cost of that split is drift, and drift here is not loud: a client added
 * to one file and not the other renders a page missing its prerequisites and
 * its symptom table, at HTTP 200, looking roughly fine. These assertions make
 * it a red build instead.
 */

describe("MCP client records", () => {
  it("has a guide for every client, and no orphan guides", () => {
    const clients = MCP_CLIENTS.map((c) => c.slug).sort();
    const guides = Object.keys(CLIENT_GUIDES).sort();
    expect(guides).toEqual(clients);
  });

  it("gives every client an install path and a verification step", () => {
    for (const client of MCP_CLIENTS) {
      const guide = CLIENT_GUIDES[client.slug];

      expect(client.install.length, `${client.slug} has no install path`).toBeGreaterThan(0);
      for (const step of client.install) {
        // A block is either something to copy or something to click. Never neither.
        expect(
          Boolean(step.code) !== Boolean(step.steps),
          `${client.slug} install "${step.label}" must have exactly one of code or steps`
        ).toBe(true);
      }

      expect(guide.requirements.length, `${client.slug} lists no prerequisites`).toBeGreaterThan(0);
      expect(guide.gotchas.length, `${client.slug} lists no gotchas`).toBeGreaterThan(0);
      expect(
        guide.troubleshooting.length,
        `${client.slug} has no client-specific troubleshooting; the shared endpoint ` +
          `symptoms alone are not a reason for this page to exist`
      ).toBeGreaterThan(0);
      expect(
        Boolean(guide.verify?.code) !== Boolean(guide.verify?.steps),
        `${client.slug} verify must have exactly one of code or steps`
      ).toBe(true);
      expect(guide.verify.expect, `${client.slug} does not say what to expect`).toBeTruthy();
      expect(guide.promptSurface, `${client.slug} does not say where to type a prompt`).toBeTruthy();
    }
  });

  /*
   * Sources are the reason these pages are trustworthy at all. Three claims
   * taken from third-party round-ups while planning this turned out to be
   * false — a Windsurf `type` field that does not exist, a Codex `--transport`
   * flag that does not exist, and a Kilo CLI that does not diverge from its
   * extension. Citing the vendor is what caught them, so it is required rather
   * than encouraged.
   */
  it("cites a vendor source for every client", () => {
    for (const client of MCP_CLIENTS) {
      const { sources } = CLIENT_GUIDES[client.slug];
      expect(sources.length, `${client.slug} cites nothing`).toBeGreaterThan(0);
      for (const src of sources) {
        expect(src.startsWith("https://"), `${client.slug} source is not https: ${src}`).toBe(true);
      }
      expect(
        /^\d{4}-\d{2}-\d{2}$/.test(client.verifiedOn),
        `${client.slug} verifiedOn must be an ISO date`
      ).toBe(true);
    }
  });

  it("references only endpoint symptoms that exist", () => {
    for (const [slug, guide] of Object.entries(CLIENT_GUIDES)) {
      for (const id of guide.issues) {
        expect(
          Object.hasOwn(ENDPOINT_ISSUES, id),
          `${slug} references unknown endpoint issue "${id}"`
        ).toBe(true);
      }
      // Selected, not pasted: the point of keying them is that a page shows
      // only what can happen to it.
      expect(endpointIssuesFor(guide).length).toBe(guide.issues.length);
    }
  });
});
