import { and, desc, eq, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, follows, likes, posts, users } from "@/lib/db/schema";

export const FEED_PAGE_SIZE = 20;

export type FeedPost = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarSeed: string;
  };
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  ownedByViewer: boolean;
};

type FeedOptions = {
  viewerId?: string | null;
  cursor?: string | null;
  authorId?: string | null;
  scope?: "all" | "following";
  limit?: number;
};

// Counts are correlated subqueries rather than joins + GROUP BY: two separate
// aggregates over the same rows would otherwise multiply against each other.
function selection(viewerId?: string | null) {
  return {
    id: posts.id,
    content: posts.content,
    createdAt: posts.createdAt,
    updatedAt: posts.updatedAt,
    authorId: users.id,
    authorUsername: users.username,
    authorDisplayName: users.displayName,
    authorAvatarSeed: users.avatarSeed,
    likeCount: sql<number>`(
      select count(*)::int from ${likes} where ${likes.postId} = ${posts.id}
    )`,
    commentCount: sql<number>`(
      select count(*)::int from ${comments} where ${comments.postId} = ${posts.id}
    )`,
    likedByViewer: viewerId
      ? sql<boolean>`exists(
          select 1 from ${likes}
          where ${likes.postId} = ${posts.id} and ${likes.userId} = ${viewerId}
        )`
      : sql<boolean>`false`,
  };
}

type RawRow = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarSeed: string;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
};

export function toFeedPost(row: RawRow, viewerId?: string | null): FeedPost {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    edited: row.updatedAt.getTime() - row.createdAt.getTime() > 1000,
    author: {
      id: row.authorId,
      username: row.authorUsername,
      displayName: row.authorDisplayName,
      avatarSeed: row.authorAvatarSeed,
    },
    likeCount: Number(row.likeCount),
    commentCount: Number(row.commentCount),
    likedByViewer: Boolean(row.likedByViewer),
    ownedByViewer: Boolean(viewerId) && row.authorId === viewerId,
  };
}

export async function getFeed({
  viewerId,
  cursor,
  authorId,
  scope = "all",
  limit = FEED_PAGE_SIZE,
}: FeedOptions) {
  const filters: (SQL | undefined)[] = [];

  if (cursor) {
    const [rawDate, rawId] = cursor.split("|");
    const at = new Date(rawDate);
    if (!Number.isNaN(at.getTime()) && rawId) {
      // Tie-break on id so posts sharing a timestamp are not skipped.
      filters.push(
        or(
          lt(posts.createdAt, at),
          and(eq(posts.createdAt, at), lt(posts.id, rawId)),
        ),
      );
    }
  }

  if (authorId) filters.push(eq(posts.authorId, authorId));

  if (scope === "following" && viewerId) {
    filters.push(
      sql`exists(
        select 1 from ${follows}
        where ${follows.followerId} = ${viewerId}
          and ${follows.followingId} = ${posts.authorId}
      )`,
    );
  }

  const rows = (await db
    .select(selection(viewerId))
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit + 1)) as RawRow[];

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    posts: page.map((r) => toFeedPost(r, viewerId)),
    nextCursor: hasMore
      ? `${page[page.length - 1].createdAt.toISOString()}|${page[page.length - 1].id}`
      : null,
  };
}

export async function getPostById(id: string, viewerId?: string | null) {
  const rows = (await db
    .select(selection(viewerId))
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.id, id))
    .limit(1)) as RawRow[];

  return rows.length ? toFeedPost(rows[0], viewerId) : null;
}
