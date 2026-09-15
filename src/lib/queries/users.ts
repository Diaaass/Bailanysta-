import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { follows, posts, users } from "@/lib/db/schema";

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarSeed: string;
  createdAt: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  followedByViewer: boolean;
  isViewer: boolean;
};

export async function getProfile(
  username: string,
  viewerId?: string | null,
): Promise<Profile | null> {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
      avatarSeed: users.avatarSeed,
      createdAt: users.createdAt,
      postCount: sql<number>`(
        select count(*)::int from ${posts} where ${posts.authorId} = ${users.id}
      )`,
      followerCount: sql<number>`(
        select count(*)::int from ${follows} where ${follows.followingId} = ${users.id}
      )`,
      followingCount: sql<number>`(
        select count(*)::int from ${follows} where ${follows.followerId} = ${users.id}
      )`,
      followedByViewer: viewerId
        ? sql<boolean>`exists(
            select 1 from ${follows}
            where ${follows.followerId} = ${viewerId}
              and ${follows.followingId} = ${users.id}
          )`
        : sql<boolean>`false`,
    })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    postCount: Number(row.postCount),
    followerCount: Number(row.followerCount),
    followingCount: Number(row.followingCount),
    followedByViewer: Boolean(row.followedByViewer),
    isViewer: row.id === viewerId,
  };
}

export async function getUserByUsername(username: string) {
  const [row] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function isFollowing(followerId: string, followingId: string) {
  const [row] = await db
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId),
      ),
    )
    .limit(1);
  return Boolean(row);
}
