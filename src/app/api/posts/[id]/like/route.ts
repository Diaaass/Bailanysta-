import type { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { likes, notifications, posts } from "@/lib/db/schema";
import { getSessionUser, notFound, unauthorized } from "@/lib/api";

async function loadPost(id: string) {
  const [row] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  return row ?? null;
}

async function countLikes(id: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(likes)
    .where(eq(likes.postId, id));
  return Number(row?.n ?? 0);
}

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/posts/[id]/like">,
) {
  const { id } = await ctx.params;
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  const post = await loadPost(id);
  if (!post) return notFound("Post");

  const inserted = await db
    .insert(likes)
    .values({ postId: id, userId: viewer.id })
    .onConflictDoNothing()
    .returning({ postId: likes.postId });

  // Only notify on a state change, and never for liking your own post.
  if (inserted.length && post.authorId !== viewer.id) {
    await db.insert(notifications).values({
      userId: post.authorId,
      actorId: viewer.id,
      type: "like",
      postId: id,
    });
  }

  return Response.json({ liked: true, likeCount: await countLikes(id) });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/posts/[id]/like">,
) {
  const { id } = await ctx.params;
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  await db
    .delete(likes)
    .where(and(eq(likes.postId, id), eq(likes.userId, viewer.id)));

  return Response.json({ liked: false, likeCount: await countLikes(id) });
}
