import postgres from "postgres";
import { loadEnv } from "./env.mjs";

loadEnv();
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const [v] = await sql`SELECT version()`;
  console.log("connected:", v.version.split(",")[0]);
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  const ext = await sql`SELECT extname, extversion FROM pg_extension WHERE extname='vector'`;
  console.log("pgvector:", ext.length ? ext[0].extversion : "MISSING");
} catch (e) {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
