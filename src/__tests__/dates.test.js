import { describe, expect, it } from "vitest";
import { longDate, shortDate } from "../components/dates";

describe("post page dates", () => {
  it("formats a day or a timestamp in UTC", () => {
    expect(longDate("2026-10-21")).toBe("21 October 2026");
    expect(shortDate("2026-10-21T23:30:00Z")).toBe("21 Oct 2026");
    expect(shortDate(new Date("2026-10-28T00:00:00Z"))).toBe("28 Oct 2026");
  });

  it("is null, never a throw, for anything that is not a date", () => {
    for (const bad of [null, undefined, "", "soon", "2026-13-45", new Date("x")]) {
      expect(longDate(bad)).toBeNull();
      expect(shortDate(bad)).toBeNull();
    }
  });
});
