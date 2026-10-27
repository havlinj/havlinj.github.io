import { test as base, expect } from '@playwright/test';
import { UMAMI_SCRIPT_SRC } from '../src/constants/analytics';

/**
 * Shared Playwright entry: every browser context aborts Umami before tests run.
 * Specs should import `test` / `expect` from here instead of `@playwright/test`.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    const host = new URL(UMAMI_SCRIPT_SRC).host;
    await context.route(`**/${host}/**`, (route) => route.abort());
    await use(context);
  },
});

export { expect };
export type { Locator, Page } from '@playwright/test';
