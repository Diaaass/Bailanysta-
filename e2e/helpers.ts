import type { Page } from "@playwright/test";

export const PASSWORD = "e2e-password-123";

/** Unique per run so specs never collide with each other or with the seed. */
export function uniqueUser() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    username: `e2e_${suffix}`,
    displayName: `E2E ${suffix}`,
    password: PASSWORD,
  };
}

export async function register(page: Page, user: ReturnType<typeof uniqueUser>) {
  // Specs that involve two people register a second user in the same context.
  // An authenticated visitor is redirected away from /register, so the session
  // is dropped first to keep this helper usable at any point in a test.
  await page.context().clearCookies();
  await page.goto("/register");
  await page.fill("#displayName", user.displayName);
  await page.fill("#username", user.username);
  await page.fill("#password", user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/register"));
}

export async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function publish(page: Page, text: string) {
  await page.goto("/");
  const composer = page.getByLabel("Текст поста");
  await composer.fill(text);
  await page.getByRole("button", { name: "Опубликовать" }).click();
  await page.getByText(text).first().waitFor();
}
