import { test, expect } from '@playwright/test';

/**
 * Body uses hyphens: auto; all h1–h6 must use hyphens: none (computed).
 * Scope to main.content so Astro dev toolbar headings (e.g. “Featured integrations”)
 * are not matched — they are outside the app shell and use initial hyphens: manual.
 * @see src/styles/special-typography.css
 */
const ROUTES_WITH_HEADINGS = [
  '/',
  '/writing',
  '/contact',
  '/profile',
  '/why',
  '/what-i-do',
  '/foundations',
  '/credits',
  '/blog/professionalism',
  '/blog/system-thinking-applied',
  '/blog/example',
] as const;

test.describe('Heading hyphenation', () => {
  for (const path of ROUTES_WITH_HEADINGS) {
    test(`all headings have hyphens: none (${path})`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const headings = page.locator('main.content :is(h1, h2, h3, h4, h5, h6)');
      const count = await headings.count();
      expect(count, `expected at least one heading on ${path}`).toBeGreaterThan(
        0,
      );
      for (let i = 0; i < count; i++) {
        await expect(headings.nth(i)).toHaveCSS('hyphens', 'none');
      }
    });
  }
});
