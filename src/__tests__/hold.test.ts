import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RETRY_AFTER_FAILURE_MS, hold, holdByKey } from "../server/hold";

/**
 * Every held read on the server goes through `hold`: the exploit list, the posts
 * sitemap and the trending reads. These pin its rules (see `server/hold.ts`).
 */

describe("holding a read", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("answers a stale value at once and refreshes behind it", async () => {
    let value = 1;
    const load = vi.fn(async () => value);
    const held = hold(load, 1000);
    expect(await held.read()).toBe(1);
    value = 2;
    vi.setSystemTime(Date.now() + 1000);
    expect(await held.read()).toBe(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(await held.read()).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never holds a failed read, and never lets one replace a good one", async () => {
    let value: number | null = null;
    const load = vi.fn(async () => value);
    const held = hold(load, 1000, { keep: (v) => v !== null });
    expect(await held.read()).toBeNull();
    value = 5;
    expect(await held.read()).toBe(5);
    value = null;
    vi.setSystemTime(Date.now() + 1000);
    await held.read();
    await vi.advanceTimersByTimeAsync(0);
    expect(await held.read()).toBe(5);
  });

  it("answers a failed read for failMs, then waits for a fresh one", async () => {
    let value: number | null = null;
    const load = vi.fn(async () => value);
    const held = hold(load, 10_000, { keep: (v) => v !== null, failMs: 1000 });
    expect(await held.read()).toBeNull();
    expect(await held.read()).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    value = 3;
    vi.setSystemTime(Date.now() + 1000);
    // Not the failure again: the first read after it expires gets the new value.
    expect(await held.read()).toBe(3);
  });

  it("holds a thrown failure for failMs, as it holds a failed value", async () => {
    const load = vi.fn(async () => {
      throw new Error("down");
    });
    const held = hold(load, 10_000, { failMs: 1000 });
    await expect(held.read()).rejects.toThrow("down");
    // Inside the window: the same error, and no new attempt.
    for (let i = 0; i < 3; i += 1) await expect(held.read()).rejects.toThrow("down");
    expect(load).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 1000);
    await expect(held.read()).rejects.toThrow("down");
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("does not let a load that started before a reset write after it", async () => {
    let calls = 0;
    let finish: (v: number) => void = () => {};
    const load = vi.fn(() => {
      calls += 1;
      return new Promise<number>((resolve) => (finish = resolve));
    });
    const held = hold(load, 1000);
    const first = held.read();
    held.reset();
    finish(1);
    expect(await first).toBe(1);
    // Had the old load written, this would answer 1 without loading.
    const next = held.read();
    expect(calls).toBe(2);
    finish(2);
    expect(await next).toBe(2);
  });

  it("holds per key", async () => {
    const load = vi.fn(async (key: string) => key.length);
    const held = holdByKey(load, 1000);
    expect(await held.read("ab")).toBe(2);
    expect(await held.read("abc")).toBe(3);
    expect(await held.read("ab")).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("drops the least recently read key at the cap, not every key", async () => {
    const load = vi.fn(async (key: string) => key);
    const held = holdByKey(load, 1000, {}, 2);
    await held.read("hub");
    await held.read("old");
    await held.read("hub");
    await held.read("new");
    expect(load).toHaveBeenCalledTimes(3);
    await held.read("hub");
    expect(load).toHaveBeenCalledTimes(3);
    await held.read("old");
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("waits before retrying a refresh that failed behind a good value", async () => {
    let fail = false;
    const load = vi.fn(async () => {
      if (fail) throw new Error("down");
      return 1;
    });
    const held = hold(load, 1000);
    await held.read();
    fail = true;
    vi.setSystemTime(Date.now() + 1000);
    expect(await held.read()).toBe(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(2);
    // An outage: every request still gets the held value, and none retries yet.
    for (let i = 0; i < 5; i += 1) expect(await held.read()).toBe(1);
    expect(load).toHaveBeenCalledTimes(2);
    fail = false;
    vi.setSystemTime(Date.now() + RETRY_AFTER_FAILURE_MS);
    await held.read();
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(3);
  });
});
