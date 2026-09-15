import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  callerAddress,
  checkRateLimit,
  RATE_LIMITS,
  resetRateLimit,
} from "@/lib/rate-limit";
import { seedFixture, sql, type Fixture } from "./fixtures";

let fx: Fixture;

beforeEach(async () => {
  fx = await seedFixture();
  await sql`TRUNCATE rate_events`;
});

afterAll(async () => {
  await sql.end();
});

const AI = RATE_LIMITS.ai;

async function exhaust(bucket: string, subject: string, max: number) {
  for (let i = 0; i < max; i++) {
    const result = await checkRateLimit(bucket, subject, { ...AI, max });
    expect(result.allowed).toBe(true);
  }
}

describe("checkRateLimit", () => {
  it("allows exactly max calls then blocks", async () => {
    await exhaust("ai:compose", fx.users.alice, AI.max);

    const blocked = await checkRateLimit("ai:compose", fx.users.alice, AI);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(AI.windowMs / 1000);
    }
  });

  it("counts each bucket separately", async () => {
    await exhaust("ai:compose", fx.users.alice, AI.max);
    expect((await checkRateLimit("ai:compose", fx.users.alice, AI)).allowed).toBe(
      false,
    );
    expect((await checkRateLimit("ai:ask", fx.users.alice, AI)).allowed).toBe(
      true,
    );
  });

  it("counts each subject separately", async () => {
    await exhaust("ai:compose", fx.users.alice, AI.max);
    expect((await checkRateLimit("ai:compose", fx.users.alice, AI)).allowed).toBe(
      false,
    );
    expect((await checkRateLimit("ai:compose", fx.users.bolat, AI)).allowed).toBe(
      true,
    );
  });

  it("reports the remaining budget", async () => {
    const first = await checkRateLimit("ai:compose", fx.users.chloe, AI);
    expect(first.allowed && first.remaining).toBe(AI.max - 1);
  });

  it("ignores attempts that fell out of the window", async () => {
    await exhaust("ai:compose", fx.users.alice, AI.max);
    await sql`
      UPDATE rate_events SET created_at = NOW() - INTERVAL '2 hours'
      WHERE subject = ${fx.users.alice}
    `;
    expect((await checkRateLimit("ai:compose", fx.users.alice, AI)).allowed).toBe(
      true,
    );
  });

  it("shares the counter between independent calls", async () => {
    // The whole reason the counter lives in the database rather than in the
    // instance memory: two separate invocations must see each other's writes.
    await checkRateLimit("ai:ask", fx.users.bolat, AI);
    const second = await checkRateLimit("ai:ask", fx.users.bolat, AI);
    expect(second.allowed && second.remaining).toBe(AI.max - 2);
  });
});

describe("sign-in limits", () => {
  const rule = RATE_LIMITS.signIn;

  it("blocks a handle after the configured number of attempts", async () => {
    for (let i = 0; i < rule.max; i++) {
      expect(
        (await checkRateLimit("auth:signin", "user:alice", rule)).allowed,
      ).toBe(true);
    }
    expect(
      (await checkRateLimit("auth:signin", "user:alice", rule)).allowed,
    ).toBe(false);
  });

  it("does not let one handle lock out another", async () => {
    for (let i = 0; i < rule.max; i++) {
      await checkRateLimit("auth:signin", "user:alice", rule);
    }
    expect(
      (await checkRateLimit("auth:signin", "user:bolat", rule)).allowed,
    ).toBe(true);
  });

  it("is tighter than the AI limit", () => {
    expect(rule.max).toBeLessThan(RATE_LIMITS.ai.max);
    expect(rule.windowMs).toBeLessThan(RATE_LIMITS.ai.windowMs);
  });

  it("clears the counter after a successful sign-in", async () => {
    for (let i = 0; i < rule.max; i++) {
      await checkRateLimit("auth:signin", "user:alice", rule);
    }
    expect(
      (await checkRateLimit("auth:signin", "user:alice", rule)).allowed,
    ).toBe(false);

    await resetRateLimit("auth:signin", "user:alice");
    expect(
      (await checkRateLimit("auth:signin", "user:alice", rule)).allowed,
    ).toBe(true);
  });
});

describe("callerAddress", () => {
  it("takes the left-most entry of x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
    });
    expect(callerAddress(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(callerAddress(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe(
      "198.51.100.4",
    );
  });

  it("degrades to a constant rather than throwing", () => {
    expect(callerAddress(new Headers())).toBe("unknown");
  });

  it("truncates so a forged header cannot overflow the column", () => {
    const headers = new Headers({ "x-forwarded-for": "a".repeat(500) });
    expect(callerAddress(headers).length).toBeLessThanOrEqual(120);
  });
});
