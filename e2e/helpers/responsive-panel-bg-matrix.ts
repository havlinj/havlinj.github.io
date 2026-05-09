import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Reusable viewport matrix for pages whose panel (or hero) background uses
 * `<picture>` / `srcset` with oversampled tiers (`*_720.png`, `*_1080.png`, …).
 *
 * Each case spins up a fresh browser context so `viewport` + `deviceScaleFactor`
 * match production-like selection (width × DPR drives `sizes: 100vw` math).
 *
 * Tuning: when markup or asset widths change, adjust viewports/DPR per tier and
 * re-run this suite; comments on each case should record *why* that tuple maps to a tier.
 */
export type ResponsivePanelBgCase = {
  /** Filename tier / semantic label (appears in test title). */
  tierLabel: string;
  viewport: { width: number; height: number };
  /** Defaults to 1. Use >1 to exercise higher-density slots without giant viewports. */
  deviceScaleFactor?: number;
  /** Checked against `HTMLImageElement.currentSrc` (absolute URL). */
  urlMatcher: RegExp;
};

export type ResponsivePanelBgMatrixConfig = {
  suiteTitle: string;
  path: string;
  imgSelector: string;
  cases: ResponsivePanelBgCase[];
  waitForReady?: (page: Page) => Promise<void>;
  /**
   * When set, the whole describe is skipped (pages not yet on `<picture>` + responsive assets).
   */
  skipSuiteReason?: string;
};

async function readResponsiveImgUrl(page: Page, imgSelector: string): Promise<string> {
  const locator = page.locator(imgSelector).first();
  await expect(locator).toBeAttached({ timeout: 15_000 });
  await expect
    .poll(
      async () =>
        locator.evaluate((el) => {
          const img = el as HTMLImageElement;
          return img.complete && img.naturalWidth > 0;
        }),
      { timeout: 15_000 },
    )
    .toBe(true);

  return locator.evaluate((el) => {
    const img = el as HTMLImageElement;
    return img.currentSrc || img.getAttribute('src') || '';
  });
}

function registerCases(config: ResponsivePanelBgMatrixConfig): void {
  test.describe.configure({ mode: 'parallel' });

  for (const c of config.cases) {
    const dpr = c.deviceScaleFactor ?? 1;
    const dprNote = dpr !== 1 ? `, dpr=${dpr}` : '';
    test(`tier “${c.tierLabel}” @ ${c.viewport.width}×${c.viewport.height}${dprNote}`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        baseURL,
        viewport: c.viewport,
        deviceScaleFactor: dpr,
      });
      const page = await context.newPage();
      try {
        await page.goto(config.path, { waitUntil: 'domcontentloaded' });
        await config.waitForReady?.(page);
        const url = await readResponsiveImgUrl(page, config.imgSelector);
        expect(url).toMatch(c.urlMatcher);
      } finally {
        await context.close();
      }
    });
  }
}

/** Register one matrix block (five cases typical). Safe to call multiple times per file. */
export function declareResponsivePanelBgMatrix(
  config: ResponsivePanelBgMatrixConfig,
): void {
  const body = () => {
    if (config.skipSuiteReason && config.cases.length === 0) {
      /* Keeps skipped suites visible in `playwright test` summaries (no silent empty describes). */
      test('matrix cases not registered yet', async () => {});
      return;
    }
    registerCases(config);
  };

  if (config.skipSuiteReason) {
    test.describe.skip(
      `${config.suiteTitle} — ${config.skipSuiteReason}`,
      body,
    );
  } else {
    test.describe(config.suiteTitle, body);
  }
}
