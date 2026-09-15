import postgres from "postgres";
import { loadEnv } from "./env.mjs";

loadEnv();

const BASE_URL = process.env.AI_BASE_URL?.replace(/\/$/, "");
const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_EMBEDDING_MODEL;
const DIMENSIONS = 1536;

if (!BASE_URL || !API_KEY || !MODEL) {
  console.error(
    "AI_BASE_URL, AI_API_KEY and AI_EMBEDDING_MODEL must be set in .env.local",
  );
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function embed(input: string): Promise<number[]> {
  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input, dimensions: DIMENSIONS }),
  });

  if (!res.ok) {
    throw new Error(`${res.status}: ${(await res.text()).slice(0, 160)}`);
  }

  const data = (await res.json()) as { data: { embedding: number[] }[] };
  const vector = data.data?.[0]?.embedding;
  if (vector?.length !== DIMENSIONS) {
    throw new Error(`expected ${DIMENSIONS} dimensions, got ${vector?.length}`);
  }
  return vector;
}

async function main() {
  const pending = await sql<{ id: string; content: string }[]>`
    SELECT id, content FROM posts WHERE embedding IS NULL ORDER BY created_at
  `;

  if (pending.length === 0) {
    console.log("nothing to backfill: every post already has an embedding");
    return;
  }

  console.log(`backfilling ${pending.length} posts…`);
  const timings: number[] = [];
  let failed = 0;

  for (const [i, post] of pending.entries()) {
    const started = Date.now();
    try {
      const vector = await embed(post.content);
      await sql`
        UPDATE posts SET embedding = ${`[${vector.join(",")}]`}::vector
        WHERE id = ${post.id}
      `;
      const ms = Date.now() - started;
      timings.push(ms);
      console.log(`  [${i + 1}/${pending.length}] ${ms}ms  ${post.content.slice(0, 48)}…`);
    } catch (e) {
      failed++;
      console.error(`  [${i + 1}/${pending.length}] FAILED: ${(e as Error).message}`);
    }
  }

  if (timings.length) {
    const sorted = [...timings].sort((a, b) => a - b);
    const avg = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    console.log(
      `\nindexed ${timings.length}, failed ${failed} | avg ${avg}ms | p95 ${p95}ms | min ${sorted[0]}ms | max ${sorted[sorted.length - 1]}ms`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
