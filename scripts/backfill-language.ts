import postgres from "postgres";
import { loadEnv } from "./env.mjs";
import { detectLanguage } from "../src/lib/language";

loadEnv();

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const rows = await sql<{ id: string; content: string }[]>`
    SELECT id, content FROM posts WHERE lang IS NULL
  `;

  if (rows.length === 0) {
    console.log("nothing to do: every post already carries a language");
    return;
  }

  const tally: Record<string, number> = {};
  for (const row of rows) {
    const lang = detectLanguage(row.content);
    tally[lang ?? "none"] = (tally[lang ?? "none"] ?? 0) + 1;
    if (lang) {
      await sql`UPDATE posts SET lang = ${lang} WHERE id = ${row.id}`;
    }
  }

  console.log(`scanned ${rows.length} posts:`);
  for (const [lang, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lang}: ${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
