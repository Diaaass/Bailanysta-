import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

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
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

// End-to-end runs against the test branch, never the database the app uses in
// development: the specs create real users and posts.
const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  process.env.TEST_DATABASE_URL ??
  fileEnv.TEST_DATABASE_URL ??
  "";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    locale: "ru-RU",
    trace: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start -- --port 3100",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          DATABASE_URL: databaseUrl,
          // `next start` on a non-standard port is not a host Auth.js trusts by
          // default (on Vercel it is detected automatically), and without this
          // every session lookup fails with UntrustedHost.
          AUTH_TRUST_HOST: "true",
          AUTH_SECRET:
            process.env.AUTH_SECRET ?? fileEnv.AUTH_SECRET ?? "e2e-secret",
          // AI is deliberately left unset: the specs assert the degraded path,
          // which must work without a key and without spending one.
          AI_BASE_URL: "",
          AI_API_KEY: "",
        },
      },
});
