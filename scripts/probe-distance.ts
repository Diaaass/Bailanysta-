import postgres from "postgres";
import { loadEnv } from "./env.mjs";
loadEnv();

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function embed(input: string) {
  const res = await fetch(`${process.env.AI_BASE_URL!.replace(/\/$/, "")}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({ model: process.env.AI_EMBEDDING_MODEL, input, dimensions: 1536 }),
  });
  return (await res.json()).data[0].embedding as number[];
}

async function probe(q: string) {
  const v = `[${(await embed(q)).join(",")}]`;
  const rows = await sql<{ d: number; content: string }[]>`
    SELECT (embedding <=> ${v}::vector) AS d, content
    FROM posts WHERE embedding IS NOT NULL ORDER BY d LIMIT 6`;
  console.log(`\nQUERY: ${q}`);
  rows.forEach((r) => console.log(`  ${Number(r.d).toFixed(4)}  ${r.content.slice(0, 58)}`));
}

async function main() {
  for (const q of ["оқу", "векторный поиск", "design systems", "рецепт борща"]) {
    await probe(q);
  }
}
main().finally(() => sql.end());
