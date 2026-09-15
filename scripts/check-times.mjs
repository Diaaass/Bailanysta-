import postgres from "postgres";
import { loadEnv } from "./env.mjs";
loadEnv();
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [r] = await sql`
  SELECT count(*) FILTER (WHERE created_at > now())::int AS future,
         count(*)::int AS total,
         max(created_at) AS newest,
         now() AS now
  FROM posts`;
console.log("всего постов:", r.total, "| в будущем:", r.future);
console.log("самый новый:", r.newest.toISOString());
console.log("сейчас:     ", r.now.toISOString());
await sql.end();
