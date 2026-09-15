import postgres from "postgres";
import { loadEnv } from "./env.mjs";
loadEnv();
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [before] = await sql`SELECT count(*) FILTER (WHERE created_at > now())::int AS n FROM posts`;
if (before.n === 0) {
  console.log("постов из будущего нет");
} else {
  // Shift the offending rows back as one block so their relative order holds.
  await sql`
    WITH shift AS (
      SELECT (max(created_at) - now() + interval '10 minutes') AS d FROM posts
    )
    UPDATE posts
    SET created_at = created_at - (SELECT d FROM shift),
        updated_at = updated_at - (SELECT d FROM shift)
    WHERE created_at > now()
  `;
  const [after] = await sql`SELECT count(*) FILTER (WHERE created_at > now())::int AS n, max(created_at) AS newest FROM posts`;
  console.log(`сдвинуто ${before.n}, осталось в будущем: ${after.n}, самый новый: ${after.newest.toISOString()}`);
}
await sql.end();
