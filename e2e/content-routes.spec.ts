import { expect, test } from './pw-test';

test.describe('Content slug routes', () => {
  test('unknown markdown slug returns 404', async ({ page }) => {
    const response = await page.goto('/__e2e_nonexistent_slug_404__', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status(), 'unknown slug should 404').toBe(404);
  });
});
