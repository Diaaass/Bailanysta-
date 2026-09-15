import type { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { follows, notifications } from "@/lib/db/schema";
import { getSessionUser, jsonError, notFound, unauthorized } from "@/lib/api";
import { getUserByUsername } from "@/lib/queries/users";

async function countFollowers(userId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followingId, userId));
  return Number(row?.n ?? 0);
}

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/users/[username]/follow">,
) {
  const { username } = await ctx.params;
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  const target = await getUserByUsername(username);
  if (!target) return notFound("User");
  if (target.id === viewer.id) {
    return jsonError("Нельзя подписаться на себя", 400);
  }

  const inserted = await db
    .insert(follows)
    .values({ followerId: viewer.id, followingId: target.id })
    .onConflictDoNothing()
    .returning({ followerId: follows.followerId });

  if (inserted.length) {
    await db.insert(notifications).values({
      userId: target.id,
      actorId: viewer.id,
      type: "follow",
    });
  }

  return Response.json({
    following: true,
    followerCount: await countFollowers(target.id),
  });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/users/[username]/follow">,
) {
  const { username } = await ctx.params;
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  const target = await getUserByUsername(username);
  if (!target) return notFound("User");

  await db
    .delete(follows)
    .where(
      and(
        eq(follows.followerId, viewer.id),
        eq(follows.followingId, target.id),
      ),
    );

  return Response.json({
    following: false,
    followerCount: await countFollowers(target.id),
  });
}
