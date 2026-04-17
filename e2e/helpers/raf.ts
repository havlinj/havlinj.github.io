import type { Page } from '@playwright/test';

/** Two rAF ticks so layout / why-box-scroll `update()` after scrollTop settle. */
export async function waitTwoFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}
