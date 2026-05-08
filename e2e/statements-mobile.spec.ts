import { expect, test } from '@playwright/test';

type StatementMetrics = {
  fontSizePx: number;
  lineHeightRatio: number;
  marginTopOverFont: number;
  marginRightOverFont: number;
  marginBottomOverFont: number;
  marginLeftOverFont: number;
};

function readStatementMetrics(selector: string): StatementMetrics | null {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return null;

  const cs = getComputedStyle(el);
  const fontSizePx = parseFloat(cs.fontSize);
  const lineHeightPx = parseFloat(cs.lineHeight);
  const marginTopPx = parseFloat(cs.marginTop);
  const marginRightPx = parseFloat(cs.marginRight);
  const marginBottomPx = parseFloat(cs.marginBottom);
  const marginLeftPx = parseFloat(cs.marginLeft);

  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) return null;

  return {
    fontSizePx,
    lineHeightRatio: lineHeightPx / fontSizePx,
    marginTopOverFont: marginTopPx / fontSizePx,
    marginRightOverFont: marginRightPx / fontSizePx,
    marginBottomOverFont: marginBottomPx / fontSizePx,
    marginLeftOverFont: marginLeftPx / fontSizePx,
  };
}

test.describe('Blog statement styles (mobile)', () => {
  test('without statement media overrides, emphasis and hero stay consistent vs desktop', async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/blog/system-thinking-applied', {
      waitUntil: 'domcontentloaded',
    });

    const emphasis = page.locator('.article-body .statement-emphasis').first();
    const hero = page.locator('.article-body .statement-hero').first();

    await expect(emphasis).toBeVisible();
    await expect(hero).toBeVisible();

    const desktopEmphasis = await page.evaluate(
      readStatementMetrics,
      '.article-body .statement-emphasis',
    );
    const desktopHero = await page.evaluate(
      readStatementMetrics,
      '.article-body .statement-hero',
    );

    expect(desktopEmphasis).not.toBeNull();
    expect(desktopHero).not.toBeNull();

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/blog/system-thinking-applied', {
      waitUntil: 'domcontentloaded',
    });

    const mobileEmphasis = await page.evaluate(
      readStatementMetrics,
      '.article-body .statement-emphasis',
    );
    const mobileHero = await page.evaluate(
      readStatementMetrics,
      '.article-body .statement-hero',
    );

    expect(mobileEmphasis).not.toBeNull();
    expect(mobileHero).not.toBeNull();

    /* WebKit rounds lh/margin ratios slightly differently vs Chromium at mobile widths. */
    const p = browserName === 'webkit' ? 1 : 2;

    // No @media overrides for statements: values should stay effectively unchanged.
    expect(mobileEmphasis!.lineHeightRatio).toBeCloseTo(
      desktopEmphasis!.lineHeightRatio,
      p,
    );
    expect(mobileEmphasis!.marginTopOverFont).toBeCloseTo(
      desktopEmphasis!.marginTopOverFont,
      p,
    );
    expect(mobileEmphasis!.marginRightOverFont).toBeCloseTo(
      desktopEmphasis!.marginRightOverFont,
      p,
    );
    expect(mobileEmphasis!.marginBottomOverFont).toBeCloseTo(
      desktopEmphasis!.marginBottomOverFont,
      p,
    );
    expect(mobileEmphasis!.marginLeftOverFont).toBeCloseTo(
      desktopEmphasis!.marginLeftOverFont,
      p,
    );

    expect(mobileHero!.lineHeightRatio).toBeCloseTo(
      desktopHero!.lineHeightRatio,
      p,
    );
    expect(mobileHero!.marginTopOverFont).toBeCloseTo(
      desktopHero!.marginTopOverFont,
      p,
    );
    expect(mobileHero!.marginRightOverFont).toBeCloseTo(
      desktopHero!.marginRightOverFont,
      p,
    );
    expect(mobileHero!.marginBottomOverFont).toBeCloseTo(
      desktopHero!.marginBottomOverFont,
      p,
    );
    expect(mobileHero!.marginLeftOverFont).toBeCloseTo(
      desktopHero!.marginLeftOverFont,
      p,
    );
  });
});
