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

test.describe('Blog statement styles (desktop)', () => {
  test('statement classes keep expected base spacing and line-height', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/blog/system-thinking-applied', {
      waitUntil: 'domcontentloaded',
    });

    const soft = page.locator('.article-body .statement-soft').first();
    const emphasis = page.locator('.article-body .statement-emphasis').first();
    const hero = page.locator('.article-body .statement-hero').first();

    await expect(soft).toBeVisible();
    await expect(emphasis).toBeVisible();
    await expect(hero).toBeVisible();

    const softMetrics = await page.evaluate(
      readStatementMetrics,
      '.article-body .statement-soft',
    );
    const emphasisMetrics = await page.evaluate(
      readStatementMetrics,
      '.article-body .statement-emphasis',
    );
    const heroMetrics = await page.evaluate(
      readStatementMetrics,
      '.article-body .statement-hero',
    );

    expect(softMetrics).not.toBeNull();
    expect(emphasisMetrics).not.toBeNull();
    expect(heroMetrics).not.toBeNull();

    expect(softMetrics!.lineHeightRatio).toBeGreaterThan(1.56);
    expect(softMetrics!.lineHeightRatio).toBeLessThan(1.6);

    expect(emphasisMetrics!.lineHeightRatio).toBeGreaterThan(1.58);
    expect(emphasisMetrics!.lineHeightRatio).toBeLessThan(1.62);
    expect(emphasisMetrics!.marginTopOverFont).toBeGreaterThan(1.87);
    expect(emphasisMetrics!.marginTopOverFont).toBeLessThan(1.93);
    expect(emphasisMetrics!.marginRightOverFont).toBeGreaterThan(1.77);
    expect(emphasisMetrics!.marginRightOverFont).toBeLessThan(1.83);
    expect(emphasisMetrics!.marginBottomOverFont).toBeGreaterThan(1.97);
    expect(emphasisMetrics!.marginBottomOverFont).toBeLessThan(2.03);
    expect(emphasisMetrics!.marginLeftOverFont).toBeGreaterThanOrEqual(0);
    expect(emphasisMetrics!.marginLeftOverFont).toBeLessThan(0.04);

    expect(heroMetrics!.lineHeightRatio).toBeGreaterThan(1.6);
    expect(heroMetrics!.lineHeightRatio).toBeLessThan(1.64);
    expect(heroMetrics!.marginTopOverFont).toBeGreaterThan(2.27);
    expect(heroMetrics!.marginTopOverFont).toBeLessThan(2.33);
    expect(heroMetrics!.marginRightOverFont).toBeGreaterThan(1.47);
    expect(heroMetrics!.marginRightOverFont).toBeLessThan(1.53);
    expect(heroMetrics!.marginBottomOverFont).toBeGreaterThan(2.37);
    expect(heroMetrics!.marginBottomOverFont).toBeLessThan(2.43);
    expect(heroMetrics!.marginLeftOverFont).toBeGreaterThanOrEqual(0);
    expect(heroMetrics!.marginLeftOverFont).toBeLessThan(0.04);
  });

  test('statement-plain baseline spacing is present on blog content', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/blog/professionalism', {
      waitUntil: 'domcontentloaded',
    });

    const plain = page.locator('.article-body .statement-plain').first();
    await expect(plain).toBeVisible();
    await expect(plain).toHaveCSS('margin-top', '22.4px');
    await expect(plain).toHaveCSS('margin-bottom', '22.4px');
  });
});
