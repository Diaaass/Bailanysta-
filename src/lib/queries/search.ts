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
  hasMore: boolean;
  nextOffset: number | null;
};

export const SEARCH_PAGE_SIZE = 15;

// Thresholds measured against the seeded corpus with gemini-embedding-001
// (scripts/probe-distance.ts). Real matches land at 0.22-0.37 cosine distance,
// the first unrelated post at 0.43, and a query with no matching topic at all
// bottoms out around 0.47 - so 0.42 separates signal from noise and correctly
// returns nothing for an off-topic query. Retune after changing the model.
const MAX_DISTANCE = 0.42;
const MIN_DISTANCE = 0.15;
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
    lang: posts.lang,
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
  { limit = SEARCH_PAGE_SIZE, offset = 0 } = {},
): Promise<SearchOutcome> {
  const query = rawQuery.trim();
  if (!query) {
    return {
      results: [],
      semanticAvailable: false,
      semanticError: null,
      hasMore: false,
      nextOffset: null,
    };
  }

  // Ranking is by relevance, not time, so a timestamp cursor cannot express a
  // position in the list. Each page therefore re-reads the candidate set to a
  // depth of offset + limit and slices it: correct at any depth, and the cost
  // grows only as far as the reader actually scrolls.
  const depth = offset + limit + 1;

  const escaped = query.replace(/[\\%_]/g, (m) => `\\${m}`);

  const textRows = await db
    .select(baseSelection(viewerId))
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(ilike(posts.content, `%${escaped}%`))
    .orderBy(desc(posts.createdAt))
    .limit(depth);

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
        .limit(depth);

      semanticAvailable = true;

      for (const row of semanticRows) {
        const distance = Number(row.distance);
        if (!Number.isFinite(distance) || distance > MAX_DISTANCE) continue;

        // Normalised across the useful band rather than the full 0..MAX range,
        // so the strongest hit scores near 1 instead of near 0.17.
        const similarity = Math.min(
          1,
          Math.max(
            0,
            (MAX_DISTANCE - distance) / (MAX_DISTANCE - MIN_DISTANCE),
          ),
        );
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

  const ranked = [...merged.values()].sort(
    (a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt),
  );

  const page = ranked.slice(offset, offset + limit);
  const hasMore = ranked.length > offset + limit;

  return {
    results: page,
    semanticAvailable,
    semanticError,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}
