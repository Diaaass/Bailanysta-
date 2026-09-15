import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiUsage } from "@/lib/db/schema";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_CALLS = 15;
const CLEANUP_PROBABILITY = 0.05;

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Counts calls in a shared table rather than in process memory, so the ceiling
 * is the same however many serverless instances are warm.
 */
export async function checkRateLimit(
  userId: string,
  kind: string,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [used] = await db
    .select({
      n: sql<number>`count(*)::int`,
      oldest: sql<Date | null>`min(${aiUsage.createdAt})`,
    })
    .from(aiUsage)
    .where(
      and(
        eq(aiUsage.userId, userId),
        eq(aiUsage.kind, kind),
        gte(aiUsage.createdAt, since),
      ),
    );

  const count = Number(used?.n ?? 0);

  if (count >= MAX_CALLS) {
    const oldest = used?.oldest ? new Date(used.oldest) : since;
    const retryAfterMs = Math.max(
      1000,
      WINDOW_MS - (Date.now() - oldest.getTime()),
    );
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  await db.insert(aiUsage).values({ userId, kind });

  // Sweeping on a fraction of calls keeps the table bounded without a cron job
  // and without paying a third round trip on every request.
  if (Math.random() < CLEANUP_PROBABILITY) {
    await db.delete(aiUsage).where(lt(aiUsage.createdAt, since));
  }

  return { allowed: true, remaining: MAX_CALLS - count - 1 };
}

export const RATE_LIMIT = { WINDOW_MS, MAX_CALLS } as const;
