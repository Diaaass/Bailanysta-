import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, RATE_LIMIT } from "@/lib/ai/rate-limit";
import { seedFixture, sql, type Fixture } from "./fixtures";

let fx: Fixture;

beforeEach(async () => {
  fx = await seedFixture();
});

afterAll(async () => {
  await sql.end();
});

async function exhaust(userId: string, kind: string) {
  for (let i = 0; i < RATE_LIMIT.MAX_CALLS; i++) {
    const result = await checkRateLimit(userId, kind);
    expect(result.allowed).toBe(true);
  }
}

describe("checkRateLimit", () => {
  it("allows exactly MAX_CALLS then blocks", async () => {
    await exhaust(fx.users.alice, "compose");

    const blocked = await checkRateLimit(fx.users.alice, "compose");
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(
        RATE_LIMIT.WINDOW_MS / 1000,
      );
    }
  });

  it("counts each kind separately", async () => {
    await exhaust(fx.users.alice, "compose");
    expect((await checkRateLimit(fx.users.alice, "compose")).allowed).toBe(
      false,
    );
    expect((await checkRateLimit(fx.users.alice, "ask")).allowed).toBe(true);
  });

  it("counts each user separately", async () => {
    await exhaust(fx.users.alice, "compose");
    expect((await checkRateLimit(fx.users.alice, "compose")).allowed).toBe(
      false,
    );
    expect((await checkRateLimit(fx.users.bolat, "compose")).allowed).toBe(true);
  });

  it("reports the remaining budget", async () => {
    const first = await checkRateLimit(fx.users.chloe, "compose");
    expect(first.allowed && first.remaining).toBe(RATE_LIMIT.MAX_CALLS - 1);
  });

  it("ignores calls that fell out of the window", async () => {
    await exhaust(fx.users.alice, "compose");
    await sql`
      UPDATE ai_usage SET created_at = NOW() - INTERVAL '2 hours'
      WHERE user_id = ${fx.users.alice}
    `;

    expect((await checkRateLimit(fx.users.alice, "compose")).allowed).toBe(true);
  });

  it("shares the counter between independent calls", async () => {
    // The whole reason the counter lives in the database rather than in the
    // instance memory: two separate invocations must see each other's writes.
    await checkRateLimit(fx.users.bolat, "ask");
    const second = await checkRateLimit(fx.users.bolat, "ask");
    expect(second.allowed && second.remaining).toBe(RATE_LIMIT.MAX_CALLS - 2);
  });
});
