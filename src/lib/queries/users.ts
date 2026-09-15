import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { follows, users } from "@/lib/db/schema";

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
      // Drizzle only qualifies column names when the outer query has a join.
      // This select has none, so interpolated references would render bare and
      // "id" inside the subquery would bind to the subquery's own table
      // instead of users. These stay fully qualified by hand.
      postCount: sql<number>`(
        select count(*)::int from posts where posts.author_id = users.id
      )`,
      followerCount: sql<number>`(
        select count(*)::int from follows where follows.following_id = users.id
      )`,
      followingCount: sql<number>`(
        select count(*)::int from follows where follows.follower_id = users.id
      )`,
      followedByViewer: viewerId
        ? sql<boolean>`exists(
            select 1 from follows
            where follows.follower_id = ${viewerId}
              and follows.following_id = users.id
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

export type ViewerChrome = {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  unreadCount: number;
};

// The shell reads identity from the database rather than the JWT: a renamed
// user would otherwise keep the old name in the sidebar until they signed out.
export async function getViewerChrome(
  userId: string,
): Promise<ViewerChrome | null> {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarSeed: users.avatarSeed,
      unreadCount: sql<number>`(
        select count(*)::int from notifications
        where notifications.user_id = users.id and notifications.is_read = false
      )`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row ? { ...row, unreadCount: Number(row.unreadCount) } : null;
}

export async function updateProfile(
  userId: string,
  data: { displayName: string; bio: string },
) {
  const [row] = await db
    .update(users)
    .set({ displayName: data.displayName, bio: data.bio })
    .where(eq(users.id, userId))
    .returning({
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
    });
  return row ?? null;
}

export type UserCard = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarSeed: string;
  followedByViewer: boolean;
  isViewer: boolean;
};

type Direction = "followers" | "following";

export async function getConnections(
  username: string,
  direction: Direction,
  viewerId?: string | null,
): Promise<UserCard[] | null> {
  const owner = await getUserByUsername(username);
  if (!owner) return null;

  // "followers" lists people pointing at the owner; "following" lists the
  // people the owner points at. Same table, opposite columns.
  const rows =
    direction === "followers"
      ? await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            bio: users.bio,
            avatarSeed: users.avatarSeed,
            createdAt: follows.createdAt,
          })
          .from(follows)
          .innerJoin(users, eq(users.id, follows.followerId))
          .where(eq(follows.followingId, owner.id))
          .orderBy(desc(follows.createdAt))
      : await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            bio: users.bio,
            avatarSeed: users.avatarSeed,
            createdAt: follows.createdAt,
          })
          .from(follows)
          .innerJoin(users, eq(users.id, follows.followingId))
          .where(eq(follows.followerId, owner.id))
          .orderBy(desc(follows.createdAt));

  if (rows.length === 0) return [];

  const viewerFollows = viewerId
    ? new Set(
        (
          await db
            .select({ followingId: follows.followingId })
            .from(follows)
            .where(eq(follows.followerId, viewerId))
        ).map((r) => r.followingId),
      )
    : new Set<string>();

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    avatarSeed: row.avatarSeed,
    followedByViewer: viewerFollows.has(row.id),
    isViewer: row.id === viewerId,
  }));
}
