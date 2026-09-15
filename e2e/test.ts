import { test as base } from "@playwright/test";

let counter = 0;

/**
 * Each test browses from its own address.
 *
 * Sign-up and sign-in are rate limited per caller address, so a whole suite
 * sharing one address would throttle itself after a handful of tests — and the
 * failure looks like a hang, not like a limit. Giving every test a distinct
 * address keeps the limiter switched on and exercised rather than bypassed.
 */
export const test = base.extend<{ callerAddress: string }>({
  callerAddress: async ({}, use) => {
    counter += 1;
    // TEST-NET-3, reserved for documentation and never routable.
    await use(`203.0.113.${(counter % 250) + 1}`);
  },

  context: async ({ browser, callerAddress }, use) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": callerAddress },
    });
    await use(context);
    await context.close();
  },
});

export { expect } from "@playwright/test";
