import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { embed, isEmbeddingConfigured } from "@/lib/ai/client";

// Indexing must never fail a write: a post that could not be embedded is still
// a valid post, it just falls back to text-only search until it is backfilled.
export async function indexPost(postId: string, content: string) {
  if (!isEmbeddingConfigured()) return { indexed: false, reason: "not-configured" };

  try {
    const vector = await embed(content);
    if (!vector.every((n) => Number.isFinite(n))) {
      throw new Error("Embedding contained a non-finite value");
    }

    await db
      .update(posts)
      .set({ embedding: sql`${`[${vector.join(",")}]`}::vector` })
      .where(eq(posts.id, postId));

    return { indexed: true as const };
  } catch (e) {
    console.error("[indexPost]", postId, e);
    return { indexed: false as const, reason: "error" };
  }
}
