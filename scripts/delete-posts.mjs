import postgres from "postgres";
import { loadEnv } from "./env.mjs";
loadEnv();

const ids = process.argv.slice(2).filter((a) => a !== "--apply");
const apply = process.argv.includes("--apply");

if (ids.length === 0) {
  console.error("usage: node scripts/delete-posts.mjs <id-prefix>... [--apply]");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const rows = await sql`
  SELECT p.id, p.content, u.username,
    (SELECT count(*)::int FROM likes WHERE post_id = p.id) AS likes,
    (SELECT count(*)::int FROM comments WHERE post_id = p.id) AS comments
  FROM posts p JOIN users u ON u.id = p.author_id
  WHERE ${sql.unsafe(ids.map((_, i) => `p.id::text LIKE $${i + 1}`).join(" OR "))}
`.catch(async () => {
  // Simpler and safer than building the OR list by hand.
  return sql`
    SELECT p.id, p.content, u.username,
      (SELECT count(*)::int FROM likes WHERE post_id = p.id) AS likes,
      (SELECT count(*)::int FROM comments WHERE post_id = p.id) AS comments
    FROM posts p JOIN users u ON u.id = p.author_id
    WHERE left(p.id::text, 8) = ANY(${ids})
  `;
});

console.log(apply ? "УДАЛЯЮ:" : "БУДЕТ УДАЛЕНО (пробный прогон):");
for (const r of rows) {
  console.log(
    `  [${r.id.slice(0, 8)}] @${r.username} — ${r.content.replace(/\s+/g, " ").slice(0, 60)} (${r.likes}L ${r.comments}C)`,
  );
}
console.log(`\nнайдено ${rows.length} из ${ids.length} запрошенных`);

if (!apply) {
  console.log("\nничего не удалено. добавьте --apply чтобы выполнить.");
} else {
  const result = await sql`
    DELETE FROM posts WHERE left(id::text, 8) = ANY(${ids})
  `;
  console.log(`\nудалено строк: ${result.count}`);
}
await sql.end();
