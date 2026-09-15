import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, posts, users } from "@/lib/db/schema";

export async function getUnreadCount(userId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    );
  return Number(row?.n ?? 0);
}

export async function getNotifications(userId: string, limit = 50) {
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      postId: notifications.postId,
      postContent: posts.content,
      actorUsername: users.username,
      actorDisplayName: users.displayName,
      actorAvatarSeed: users.avatarSeed,
    })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.actorId))
    .leftJoin(posts, eq(posts.id, notifications.postId))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    isRead: r.isRead,
    createdAt: r.createdAt.toISOString(),
    postId: r.postId,
    postExcerpt: r.postContent ? r.postContent.slice(0, 90) : null,
    actor: {
      username: r.actorUsername,
      displayName: r.actorDisplayName,
      avatarSeed: r.actorAvatarSeed,
    },
  }));
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    );
}
