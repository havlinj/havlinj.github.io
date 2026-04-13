import { expect, test } from '@playwright/test';

test.describe('Display mode settings and prompt', () => {
  test('settings page shows header and display mode options', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.site-header')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Settings', level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel('Standard (default)')).toBeVisible();
    await expect(
      page.getByLabel('Legacy compatibility', { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Legacy compatibility (strong)')).toBeVisible();
    await expect(page.getByLabel('Auto detect')).toBeVisible();
  });

  test('settings toggles legacy mode class and localStorage', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    await page.getByText('Legacy compatibility', { exact: true }).click();
    await expect(page.locator('html')).toHaveClass(/display-legacy/);

    const storedLegacy = await page.evaluate(() =>
      window.localStorage.getItem('display-mode'),
    );
    expect(storedLegacy).toBe('legacy');

    await page.getByText('Standard (default)', { exact: true }).click();
    await expect(page.locator('html')).not.toHaveClass(/display-legacy/);
  });

  test('forced prompt can be dismissed with standard mode', async ({ page }) => {
    await page.goto('/?showDisplayPrompt=1', { waitUntil: 'domcontentloaded' });

    const prompt = page.locator('.display-mode-prompt');
    await expect(prompt).toBeVisible();
    await expect(
      prompt.getByText('you can change this anytime in Settings', { exact: true }),
    ).toBeVisible();
    await expect(
      prompt.getByText('for older displays, try legacy compatibility (strong)', {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'No, keep current' }).click();
    await expect(prompt).toHaveCount(0);

    const mode = await page.evaluate(() => window.localStorage.getItem('display-mode'));
    expect(mode).toBe('standard');
  });

  test('forced prompt can enable legacy mode', async ({ page }) => {
    await page.goto('/?showDisplayPrompt=1', { waitUntil: 'domcontentloaded' });

    const prompt = page.locator('.display-mode-prompt');
    await expect(prompt).toBeVisible();
    await page.getByRole('button', { name: 'Yes, enable' }).click();
    await expect(prompt).toHaveCount(0);
    await expect(page.locator('html')).toHaveClass(/display-legacy/);

    const mode = await page.evaluate(() => window.localStorage.getItem('display-mode'));
    expect(mode).toBe('legacy');
  });

  test('legacy profiles apply expected CSS variable values', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    await page.getByText('Legacy compatibility', { exact: true }).click();
    const legacyVars = await page.evaluate(() => {
      const html = document.documentElement;
      const styles = getComputedStyle(html);
      return {
        saturation: styles.getPropertyValue('--panel-bg-saturation').trim(),
        contrast: styles.getPropertyValue('--panel-bg-contrast').trim(),
        grainOpacity: styles.getPropertyValue('--profile-grain-opacity').trim(),
      };
    });
    expect(legacyVars).toEqual({
      saturation: '0.92',
      contrast: '0.96',
      grainOpacity: '0.08',
    });

    await page.getByText('Legacy compatibility (strong)', { exact: true }).click();
    const strongVars = await page.evaluate(() => {
      const html = document.documentElement;
      const styles = getComputedStyle(html);
      return {
        saturation: styles.getPropertyValue('--panel-bg-saturation').trim(),
        contrast: styles.getPropertyValue('--panel-bg-contrast').trim(),
        grainOpacity: styles.getPropertyValue('--profile-grain-opacity').trim(),
      };
    });
    expect(strongVars).toEqual({
      saturation: '0.82',
      contrast: '0.9',
      grainOpacity: '0.04',
    });
  });
});
