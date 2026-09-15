import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateEvents } from "@/lib/db/schema";

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export type RateLimitRule = { max: number; windowMs: number };

export const RATE_LIMITS = {
  ai: { max: 15, windowMs: 60 * 60 * 1000 },
  // Sign-in is the one an attacker hammers, so it is the tightest.
  signIn: { max: 10, windowMs: 15 * 60 * 1000 },
  // Deliberately loose: an office, a campus or a mobile carrier puts many
  // genuine people behind one address, and five sign-ups an hour locks all of
  // them out. The end-to-end suite found this by registering a user per test
  // and stalling on the sixth.
  signUp: { max: 30, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

const CLEANUP_PROBABILITY = 0.05;

export async function checkRateLimit(
  bucket: string,
  subject: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - rule.windowMs);

  const [used] = await db
    .select({
      n: sql<number>`count(*)::int`,
      oldest: sql<Date | null>`min(${rateEvents.createdAt})`,
    })
    .from(rateEvents)
    .where(
      and(
        eq(rateEvents.bucket, bucket),
        eq(rateEvents.subject, subject),
        gte(rateEvents.createdAt, since),
      ),
    );

  const count = Number(used?.n ?? 0);

  if (count >= rule.max) {
    const oldest = used?.oldest ? new Date(used.oldest) : since;
    const retryAfterMs = Math.max(
      1000,
      rule.windowMs - (Date.now() - oldest.getTime()),
    );
    return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  await db.insert(rateEvents).values({ bucket, subject });

  // Sweeping on a fraction of calls keeps the table bounded without a cron job
  // and without paying a third round trip on every request. Scoped to this
  // bucket on purpose: an unscoped delete would prune other buckets by *this*
  // rule's window, silently shortening a one-hour limit to fifteen minutes.
  if (Math.random() < CLEANUP_PROBABILITY) {
    await db
      .delete(rateEvents)
      .where(and(eq(rateEvents.bucket, bucket), lt(rateEvents.createdAt, since)));
  }

  return { allowed: true, remaining: rule.max - count - 1 };
}

/** Clears a subject's attempts, e.g. after a successful sign-in. */
export async function resetRateLimit(bucket: string, subject: string) {
  await db
    .delete(rateEvents)
    .where(and(eq(rateEvents.bucket, bucket), eq(rateEvents.subject, subject)));
}

/**
 * Best-effort caller address. Behind Vercel the left-most entry of
 * x-forwarded-for is the client; it is spoofable in general, which is why the
 * handle is rate-limited alongside it rather than instead of it.
 */
export function callerAddress(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 120);
  return headers.get("x-real-ip")?.slice(0, 120) ?? "unknown";
}
