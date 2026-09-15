import "server-only";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { chat, embed, isEmbeddingConfigured } from "@/lib/ai/client";

export type RagSource = {
  id: string;
  content: string;
  createdAt: string;
  retrievedBy: "semantic" | "recent";
};

export type RagAnswer = {
  answer: string;
  sources: RagSource[];
};

const SEMANTIC_LIMIT = 6;
const RECENT_LIMIT = 10;
const RECENT_WINDOW_DAYS = 30;
const CONTEXT_LIMIT = 14;

const SYSTEM = [
  "Ты отвечаешь на вопросы пользователя о его собственных постах в социальной сети Bailanysta.",
  "Используй только приведённые посты. Если в них нет ответа, так и скажи — не придумывай.",
  "Ссылайся на посты их номерами в квадратных скобках, например [2].",
  "Отвечай на языке вопроса. Коротко: два-четыре предложения.",
].join(" ");

/**
 * Retrieval is deliberately hybrid.
 *
 * A question like "что я писал про Postgres" is a lookup and vector search
 * answers it well. A question like "о чём я чаще писал за месяц" is an
 * aggregate - similarity to the question text says nothing useful, the recent
 * window does. Taking both and merging covers each without asking the user to
 * phrase the question one way.
 */
export async function retrieveOwnPosts(userId: string, question: string) {
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const recent = await db
    .select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(and(eq(posts.authorId, userId), gte(posts.createdAt, since)))
    .orderBy(desc(posts.createdAt))
    .limit(RECENT_LIMIT);

  const merged = new Map<string, RagSource>();
  for (const row of recent) {
    merged.set(row.id, {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      retrievedBy: "recent",
    });
  }

  if (isEmbeddingConfigured()) {
    const vector = await embed(question);
    if (!vector.every((n) => Number.isFinite(n))) {
      throw new Error("Embedding contained a non-finite value");
    }
    const literal = `[${vector.join(",")}]`;

    const similar = await db
      .select({
        id: posts.id,
        content: posts.content,
        createdAt: posts.createdAt,
      })
      .from(posts)
      // Scoped to the author on purpose: this endpoint must never surface
      // somebody else's posts, however the question is phrased.
      .where(and(eq(posts.authorId, userId), isNotNull(posts.embedding)))
      .orderBy(sql`${posts.embedding} <=> ${literal}::vector`)
      .limit(SEMANTIC_LIMIT);

    for (const row of similar) {
      if (merged.has(row.id)) continue;
      merged.set(row.id, {
        id: row.id,
        content: row.content,
        createdAt: row.createdAt.toISOString(),
        retrievedBy: "semantic",
      });
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, CONTEXT_LIMIT);
}

function buildContext(sources: RagSource[]) {
  return sources
    .map((source, i) => {
      const date = new Intl.DateTimeFormat("ru", {
        dateStyle: "medium",
      }).format(new Date(source.createdAt));
      return `[${i + 1}] ${date}\n${source.content}`;
    })
    .join("\n\n");
}

export async function askAboutOwnPosts(
  userId: string,
  question: string,
): Promise<RagAnswer> {
  const sources = await retrieveOwnPosts(userId, question);

  if (sources.length === 0) {
    return {
      answer:
        "Пока нечего анализировать: за последний месяц у вас нет постов. Напишите несколько — и спросите снова.",
      sources: [],
    };
  }

  const answer = await chat(
    SYSTEM,
    `Посты пользователя:\n\n${buildContext(sources)}\n\nВопрос: ${question}`,
    { maxTokens: 1400, temperature: 0.3 },
  );

  return { answer, sources };
}
