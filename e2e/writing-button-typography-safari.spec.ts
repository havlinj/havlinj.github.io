import { test, expect } from '@playwright/test';

async function gotoWritingReady(page: import('@playwright/test').Page) {
  await page.goto('/writing', { waitUntil: 'domcontentloaded' });
  await expect(
    page.locator('.writing-groups.writing-groups--visible'),
  ).toBeVisible({ timeout: 10_000 });
}

test.describe('Writing typography on Safari/WebKit', () => {
  test('mobile WebKit keeps normal title style', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'Safari-only verification');

    // iPhone 15 CSS viewport
    await page.setViewportSize({ width: 393, height: 852 });
    await gotoWritingReady(page);

    const fontStyle = await page
      .locator('.writing-groups .post-list a.page-button .page-button__text')
      .first()
      .evaluate((el) => getComputedStyle(el).fontStyle);

    expect(fontStyle).toBe('normal');
  });
});
