import { expect, type Locator } from '@playwright/test';

/**
 * `is-reveal-typefit-ready` + DOM text are not enough: reveal font can be 0px
 * (collapsed `em` copy, black tile). Assert the first line actually paints.
 */
export async function expectFoundationsRevealCopyPainted(
  tile: Locator,
): Promise<void> {
  await expect
    .poll(
      async () =>
        tile.evaluate((el) => {
          if (!(el instanceof HTMLElement)) return 0;
          const reveal = el.querySelector('.prof-tile__reveal');
          const line1 = el.querySelector(
            '.prof-tile__reveal .tile-state-secondary .line-1',
          );
          if (
            !(reveal instanceof HTMLElement) ||
            !(line1 instanceof HTMLElement)
          )
            return 0;
          const fontPx = parseFloat(getComputedStyle(reveal).fontSize) || 0;
          const lineH = line1.getBoundingClientRect().height;
          return Math.min(fontPx, lineH);
        }),
      { timeout: 5000 },
    )
    .toBeGreaterThan(2);
}
