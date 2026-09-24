import { describe, expect, it } from "vitest";
import {
  DATA_CAVEATS,
  RECIPES,
  caveatsFor,
  nextFor,
  recipeBySlug,
} from "../data/cookbook";

/**
 * §A1's bar is "working code and a real, pasted output". Neither half can be
 * asserted from here — no test can tell whether a snippet runs, and none can
 * tell whether an output was pasted or invented. What these assertions do is
 * stop the structure that makes the bar unmeetable: a recipe with no output
 * block, an output with no note, a caveat id that silently renders nothing.
 *
 * The honesty is enforced by process, not by CI, and the file header of
 * `cookbook.js` records what running the code actually caught.
 */

describe("cookbook recipes", () => {
  it("gives every recipe code, a pasted output and a note about it", () => {
    for (const r of RECIPES) {
      expect(r.steps.length, `${r.slug} has no steps`).toBeGreaterThan(0);
      for (const s of r.steps) {
        expect(s.code, `${r.slug} step "${s.heading}" has no code`).toBeTruthy();
        expect(s.language, `${r.slug} step "${s.heading}" has no language`).toBeTruthy();
      }
      expect(r.output?.code, `${r.slug} has no pasted output`).toBeTruthy();
      expect(
        r.output?.note,
        `${r.slug} pastes an output but says nothing about it; the note is the ` +
          `reason the page beats the README version of the same snippet`
      ).toBeTruthy();
      expect(r.uses.length, `${r.slug} names no endpoints`).toBeGreaterThan(0);
      expect(r.query, `${r.slug} does not state the query it answers`).toBeTruthy();
    }
  });

  it("references only caveats that exist, and renders each one it selects", () => {
    for (const r of RECIPES) {
      for (const id of r.caveats) {
        expect(
          Object.hasOwn(DATA_CAVEATS, id),
          `${r.slug} references unknown caveat "${id}"`
        ).toBe(true);
      }
      expect(caveatsFor(r).length).toBe(r.caveats.length);
    }
  });

  it("links only to recipes that exist", () => {
    for (const r of RECIPES) {
      expect(r.next.length, `${r.slug} is a dead end`).toBeGreaterThan(0);
      expect(
        nextFor(r).length,
        `${r.slug} links to a recipe that does not exist: ${r.next.join(", ")}`
      ).toBe(r.next.length);
      expect(r.next.includes(r.slug), `${r.slug} links to itself`).toBe(false);
    }
  });

  it("has unique slugs that resolve", () => {
    const slugs = RECIPES.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(recipeBySlug(s)?.slug).toBe(s);
    expect(recipeBySlug("nope")).toBeUndefined();
  });

  /*
   * Every caveat costs a reader attention on every page that shows it, so an
   * orphan is not harmless — it is a claim written and then never made. The
   * keyed shape exists to select, and a key nothing selects means the selection
   * was not thought through.
   */
  it("uses every caveat it defines", () => {
    const used = new Set(RECIPES.flatMap((r) => r.caveats));
    for (const id of Object.keys(DATA_CAVEATS)) {
      expect(used.has(id), `caveat "${id}" is defined but no recipe selects it`).toBe(true);
    }
  });
});
