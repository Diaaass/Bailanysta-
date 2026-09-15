import { describe, expect, it, vi, afterEach } from "vitest";
import { checkRateLimit } from "@/lib/ai/rate-limit";

afterEach(() => vi.useRealTimers());

describe("checkRateLimit", () => {
  it("allows the documented number of calls then blocks", () => {
    const key = `user-${Math.random()}`;
    for (let i = 0; i < 15; i++) {
      expect(checkRateLimit(key).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("counts each key separately", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < 15; i++) checkRateLimit(a);
    expect(checkRateLimit(a).allowed).toBe(false);
    expect(checkRateLimit(b).allowed).toBe(true);
  });

  it("lets the window slide", () => {
    vi.useFakeTimers();
    const key = `slide-${Math.random()}`;
    for (let i = 0; i < 15; i++) checkRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(false);

    vi.advanceTimersByTime(60 * 60 * 1000 + 1000);
    expect(checkRateLimit(key).allowed).toBe(true);
  });
});
