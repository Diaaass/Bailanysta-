import "server-only";
import { EMBEDDING_DIMENSIONS } from "@/lib/db/schema";

const BASE_URL = process.env.AI_BASE_URL?.replace(/\/$/, "");
const API_KEY = process.env.AI_API_KEY;
const CHAT_MODEL = process.env.AI_MODEL;
const EMBEDDING_MODEL = process.env.AI_EMBEDDING_MODEL;

export class AiUnavailableError extends Error {
  constructor(message = "AI-функции выключены: не задан ключ доступа") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export function isAiConfigured() {
  return Boolean(BASE_URL && API_KEY && CHAT_MODEL);
}

export function isEmbeddingConfigured() {
  return Boolean(BASE_URL && API_KEY && EMBEDDING_MODEL);
}

async function call<T>(path: string, body: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Upstream ${res.status}: ${detail.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

type ChatResponse = { choices: { message: { content: string } }[] };

// Reasoning models bill their internal thinking against max_tokens, so a
// budget sized to the visible answer alone gets truncated mid-sentence.
export async function chat(
  system: string,
  user: string,
  { maxTokens = 1200, temperature = 0.7 } = {},
) {
  if (!isAiConfigured()) throw new AiUnavailableError();

  const data = await call<ChatResponse>(
    "/chat/completions",
    {
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature,
    },
    20_000,
  );

  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

type EmbeddingResponse = { data: { embedding: number[] }[] };

export async function embed(input: string) {
  if (!isEmbeddingConfigured()) throw new AiUnavailableError();

  const data = await call<EmbeddingResponse>(
    "/embeddings",
    // Providers whose native width differs from the column (Gemini defaults to
    // 3072) honour this and return a vector the schema can store.
    { model: EMBEDDING_MODEL, input, dimensions: EMBEDDING_DIMENSIONS },
    15_000,
  );

  const vector = data.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Embedding response contained no vector");
  }
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding width ${vector.length} does not match the column (${EMBEDDING_DIMENSIONS}). ` +
        "Change AI_EMBEDDING_MODEL or migrate the posts.embedding column.",
    );
  }
  return vector;
}
