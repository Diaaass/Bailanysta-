import { desc, eq, ilike, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, likes, posts, users } from "@/lib/db/schema";
import { embed, isEmbeddingConfigured } from "@/lib/ai/client";
import { toFeedPost, type FeedPost } from "@/lib/queries/posts";

export type SearchResult = FeedPost & {
  matchedBy: ("text" | "semantic")[];
  score: number;
};

export type SearchOutcome = {
  results: SearchResult[];
  semanticAvailable: boolean;
  semanticError: string | null;
};

// Cosine distance in pgvector is 0 (identical) to 2 (opposite). Anything past
// this is unrelated in practice and only adds noise to the result list.
const MAX_DISTANCE = 0.62;
const TEXT_WEIGHT = 0.45;
const SEMANTIC_WEIGHT = 0.55;

function toVectorLiteral(vector: number[]) {
  if (!vector.every((n) => Number.isFinite(n))) {
    throw new Error("Embedding contained a non-finite value");
  }
  return `[${vector.join(",")}]`;
}

function baseSelection(viewerId?: string | null) {
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

export async function searchPosts(
  rawQuery: string,
  viewerId?: string | null,
  limit = 25,
): Promise<SearchOutcome> {
  const query = rawQuery.trim();
  if (!query) {
    return { results: [], semanticAvailable: false, semanticError: null };
  }

  const escaped = query.replace(/[\\%_]/g, (m) => `\\${m}`);

  const textRows = await db
    .select(baseSelection(viewerId))
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(ilike(posts.content, `%${escaped}%`))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const merged = new Map<string, SearchResult>();

  for (const row of textRows) {
    merged.set(row.id, {
      ...toFeedPost(row, viewerId),
      matchedBy: ["text"],
      score: TEXT_WEIGHT,
    });
  }

  let semanticAvailable = false;
  let semanticError: string | null = null;

  if (isEmbeddingConfigured()) {
    try {
      const vector = toVectorLiteral(await embed(query));

      const semanticRows = await db
        .select({
          ...baseSelection(viewerId),
          distance: sql<number>`${posts.embedding} <=> ${vector}::vector`,
        })
        .from(posts)
        .innerJoin(users, eq(users.id, posts.authorId))
        .where(isNotNull(posts.embedding))
        .orderBy(sql`${posts.embedding} <=> ${vector}::vector`)
        .limit(limit);

      semanticAvailable = true;

      for (const row of semanticRows) {
        const distance = Number(row.distance);
        if (!Number.isFinite(distance) || distance > MAX_DISTANCE) continue;

        const similarity = 1 - distance / MAX_DISTANCE;
        const existing = merged.get(row.id);

        if (existing) {
          existing.matchedBy.push("semantic");
          existing.score += SEMANTIC_WEIGHT * similarity;
        } else {
          merged.set(row.id, {
            ...toFeedPost(row, viewerId),
            matchedBy: ["semantic"],
            score: SEMANTIC_WEIGHT * similarity,
          });
        }
      }
    } catch (e) {
      semanticError =
        e instanceof Error ? e.message : "Векторный поиск недоступен";
    }
  }

  const results = [...merged.values()]
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return { results, semanticAvailable, semanticError };
}
