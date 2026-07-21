import type { Page } from '@playwright/test';

/** Profile portrait that gates the loading veil (`profile-loading-veil.ts`). */
const PORTRAIT_URL = '**/portrait_bayer16_style.png';

/**
 * Delay the profile portrait response until `allow()` is called.
 * Always call `dispose()` in a finally block.
 */
export async function holdProfilePortrait(page: Page): Promise<{
  allow: () => void;
  dispose: () => Promise<void>;
}> {
  let resolveHold: (() => void) | undefined;
  const hold = new Promise<void>((resolve) => {
    resolveHold = resolve;
  });

  const allow = () => {
    resolveHold?.();
    resolveHold = undefined;
  };

  await page.route(PORTRAIT_URL, async (route) => {
    await hold;
    await route.continue();
  });

  return {
    allow,
    dispose: async () => {
      allow();
      await page.unroute(PORTRAIT_URL);
    },
  };
}

/** Wait until type-fit has set `--profile-tile-label-font-size`. */
export async function waitForProfileTileLabelFit(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const section = document.querySelector('.profile-section');
    if (!(section instanceof HTMLElement)) return false;
    const label = getComputedStyle(section)
      .getPropertyValue('--profile-tile-label-font-size')
      .trim();
    return /^\d/.test(label);
  });
}
