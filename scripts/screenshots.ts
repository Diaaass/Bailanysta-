import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { loadEnv } from "./env.mjs";

loadEnv();

const BASE = process.env.SHOT_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("docs/screenshots");
const USER = process.env.SHOT_USER ?? "demo";
const PASSWORD = process.env.SHOT_PASSWORD ?? "demo1234";

const DESKTOP = { width: 1440, height: 940 };
const MOBILE = { width: 390, height: 844 };

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#username", USER);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
  await page.waitForLoadState("networkidle");
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => {
    localStorage.setItem("theme", value);
  }, theme);
  await page.reload({ waitUntil: "networkidle" });
}

// The Next.js dev overlay renders into a <nextjs-portal> custom element and
// would otherwise sit in the corner of every screenshot.
const HIDE_DEV_OVERLAY = "nextjs-portal { display: none !important; }";

async function shot(page: Page, name: string) {
  await page.addStyleTag({ content: HIDE_DEV_OVERLAY });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  ${name}.png`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 2,
    locale: "ru-RU",
  });
  const page = await context.newPage();

  console.log(`capturing from ${BASE}`);

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await setTheme(page, "light");
  await shot(page, "login");

  await login(page);
  await shot(page, "feed-light");

  await setTheme(page, "dark");
  await shot(page, "feed-dark");

  await page.goto(`${BASE}/search?q=graduated%20from%20university`, {
    waitUntil: "networkidle",
  });
  await shot(page, "search-semantic");

  await page.goto(`${BASE}/profile/${USER}`, { waitUntil: "networkidle" });
  await shot(page, "profile");

  await page.goto(`${BASE}/notifications`, { waitUntil: "networkidle" });
  await shot(page, "notifications");

  await context.close();

  const mobile = await browser.newContext({
    viewport: MOBILE,
    deviceScaleFactor: 2,
    locale: "ru-RU",
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobile.newPage();
  await login(mobilePage);
  await setTheme(mobilePage, "dark");
  await shot(mobilePage, "mobile-feed");

  await mobile.close();
  await browser.close();
  console.log(`\nsaved to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
