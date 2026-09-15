import type { NextRequest } from "next/server";
import { and, gt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, posts } from "@/lib/db/schema";
import { getSessionUser, unauthorized } from "@/lib/api";

/**
 * One poll for the whole app: the navigation badge and the feed both read from
 * this, so an open tab makes a single request rather than one per widget.
 */
export async function GET(request: NextRequest) {
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  const rawSince = request.nextUrl.searchParams.get("since");
  const since = rawSince ? new Date(rawSince) : null;
  const validSince = since && !Number.isNaN(since.getTime()) ? since : null;

  const [unreadRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        sql`${notifications.userId} = ${viewer.id}`,
        sql`${notifications.isRead} = false`,
      ),
    );

  let newPosts = 0;
  if (validSince) {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(posts)
      // The reader's own posts are already on screen through the optimistic
      // update, so counting them would show a badge for something visible.
      .where(and(gt(posts.createdAt, validSince), ne(posts.authorId, viewer.id)));
    newPosts = Number(row?.n ?? 0);
  }

  return Response.json({
    unread: Number(unreadRow?.n ?? 0),
    newPosts,
    checkedAt: new Date().toISOString(),
  });
}
