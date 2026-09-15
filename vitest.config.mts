import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

function readEnvFile(file: string) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return {} as Record<string, string>;

  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    out[trimmed.slice(0, i).trim()] = trimmed
      .slice(i + 1)
      .trim()
      .replace(/^"|"$/g, "");
  }
  return out;
}

const fileEnv = readEnvFile(".env.local");

// Integration tests must never touch the real database: the connection string
// comes from TEST_DATABASE_URL and is mapped onto DATABASE_URL for the workers.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? fileEnv.TEST_DATABASE_URL ?? "";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // `server-only` throws outside a React Server Component; under Vitest the
      // guard is meaningless, so it resolves to an empty module instead.
      "server-only": path.resolve(import.meta.dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      AUTH_SECRET: fileEnv.AUTH_SECRET ?? "test-secret-not-used-for-anything",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
    },
  },
});
