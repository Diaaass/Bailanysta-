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
  await page.goto("/register");
  // An authenticated visitor is bounced off /register by the proxy, so the
  // form has to be on screen before anything is typed into it.
  await page.waitForSelector("#username");
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
