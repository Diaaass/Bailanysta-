import postgres from "postgres";
import { loadEnv } from "./env.mjs";
loadEnv();
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const rows = await sql`
  SELECT p.id, p.content, p.lang, p.created_at, u.username,
    (SELECT count(*)::int FROM likes WHERE post_id = p.id) AS likes,
    (SELECT count(*)::int FROM comments WHERE post_id = p.id) AS comments
  FROM posts p JOIN users u ON u.id = p.author_id
  ORDER BY p.created_at DESC
`;
rows.forEach((r, i) => {
  const when = new Date(r.created_at).toISOString().slice(5, 16).replace("T", " ");
  const text = r.content.replace(/\s+/g, " ").slice(0, 62);
  console.log(
    `${String(i + 1).padStart(2)}. [${r.id.slice(0, 8)}] @${r.username.padEnd(12)} ${when} ${String(r.lang ?? "--").padEnd(3)} ${r.likes}L ${r.comments}C  ${text}`,
  );
});
console.log(`\nвсего: ${rows.length}`);
await sql.end();
