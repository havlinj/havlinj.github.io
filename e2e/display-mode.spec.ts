import { expect, test } from '@playwright/test';
import { DISPLAY_MODE_STORAGE_KEY } from '../src/utils/display-mode';

test.describe('Display mode settings and prompt', () => {
  test('settings page shows header and display mode options', async ({
    page,
  }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.site-header')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Settings', level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel('Standard (default)')).toBeVisible();
    await expect(
      page.getByLabel('Legacy compatibility', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel('Legacy compatibility (strong)'),
    ).toBeVisible();
    await expect(page.getByLabel('Auto detect')).toBeVisible();
  });

  test('settings toggles legacy mode class and localStorage', async ({
    page,
  }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    await page.getByText('Legacy compatibility', { exact: true }).click();
    await expect(page.locator('html')).toHaveClass(/display-legacy/);

    const storedLegacy = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      DISPLAY_MODE_STORAGE_KEY,
    );
    expect(storedLegacy).toBe('legacy');

    await page.getByText('Standard (default)', { exact: true }).click();
    await expect(page.locator('html')).not.toHaveClass(/display-legacy/);
  });

  test('forced prompt can be dismissed with standard mode', async ({
    page,
  }) => {
    await page.goto('/?showDisplayPrompt=1', { waitUntil: 'domcontentloaded' });

    const prompt = page.locator('.display-mode-prompt');
    await expect(prompt).toBeVisible();
    await expect(
      prompt.getByText('you can change this anytime in Settings', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      prompt.getByText(
        'for older displays, try legacy compatibility (strong)',
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await page.getByRole('button', { name: 'No, keep current' }).click();
    await expect(prompt).toHaveCount(0);

    const mode = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      DISPLAY_MODE_STORAGE_KEY,
    );
    expect(mode).toBe('standard');
  });

  test('forced prompt can enable legacy mode', async ({ page }) => {
    await page.goto('/?showDisplayPrompt=1', { waitUntil: 'domcontentloaded' });

    const prompt = page.locator('.display-mode-prompt');
    await expect(prompt).toBeVisible();
    await page.getByRole('button', { name: 'Yes, enable' }).click();
    await expect(prompt).toHaveCount(0);
    await expect(page.locator('html')).toHaveClass(/display-legacy/);

    const mode = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      DISPLAY_MODE_STORAGE_KEY,
    );
    expect(mode).toBe('legacy');
  });

  test('legacy profiles apply expected CSS variable values', async ({
    page,
  }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    await page.getByText('Legacy compatibility', { exact: true }).click();
    const legacyVars = await page.evaluate(() => {
      const html = document.documentElement;
      const styles = getComputedStyle(html);
      return {
        saturation: Number.parseFloat(
          styles.getPropertyValue('--panel-bg-saturation').trim(),
        ),
        contrast: Number.parseFloat(
          styles.getPropertyValue('--panel-bg-contrast').trim(),
        ),
        grainOpacity: Number.parseFloat(
          styles.getPropertyValue('--profile-grain-opacity').trim(),
        ),
      };
    });
    expect(legacyVars.saturation).toBeCloseTo(0.92, 3);
    expect(legacyVars.contrast).toBeCloseTo(0.96, 3);
    expect(legacyVars.grainOpacity).toBeCloseTo(0.08, 3);

    await page
      .getByText('Legacy compatibility (strong)', { exact: true })
      .click();
    const strongVars = await page.evaluate(() => {
      const html = document.documentElement;
      const styles = getComputedStyle(html);
      return {
        saturation: Number.parseFloat(
          styles.getPropertyValue('--panel-bg-saturation').trim(),
        ),
        contrast: Number.parseFloat(
          styles.getPropertyValue('--panel-bg-contrast').trim(),
        ),
        grainOpacity: Number.parseFloat(
          styles.getPropertyValue('--profile-grain-opacity').trim(),
        ),
      };
    });
    expect(strongVars.saturation).toBeCloseTo(0.82, 3);
    expect(strongVars.contrast).toBeCloseTo(0.9, 3);
    expect(strongVars.grainOpacity).toBeCloseTo(0.04, 3);
  });
});

test.describe('Settings marker layout (no FOUC / rem sizing)', () => {
  test('GET /settings HTML ships standard radio pre-checked', async ({
    request,
  }) => {
    const res = await request.get('/settings');
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    const tags = html.match(/<input\b[^>]*\bname="display-mode"[^>]*>/gi) ?? [];
    const standardTag = tags.find((t) => /\bvalue="standard"/i.test(t));
    expect(standardTag).toBeTruthy();
    expect(standardTag!.toLowerCase()).toMatch(/\bchecked\b/);
  });

  test('marker box size tracks root rem, not body font-size', async ({
    page,
  }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    const marker = page.locator('.display-settings-option__marker').first();
    const widthBefore = await marker.evaluate(
      (el) => getComputedStyle(el).width,
    );
    await page.addStyleTag({
      content: 'body { font-size: 22px !important; }',
    });
    const widthAfter = await marker.evaluate(
      (el) => getComputedStyle(el).width,
    );
    expect(widthAfter).toBe(widthBefore);
    const rootPx = await page.evaluate(() =>
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    const markerPx = Number.parseFloat(widthAfter);
    expect(markerPx).toBeCloseTo(0.85 * rootPx, 1);
  });

  test('checked row marker ::after matches inner rem (sync: settings.css)', async ({
    page,
  }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    const marker = page
      .locator(
        'label.display-settings-option:has(input[value="standard"]) .display-settings-option__marker',
      )
      .first();
    const rootPx = await page.evaluate(() =>
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    const after = await marker.evaluate((el) => {
      const s = getComputedStyle(el, '::after');
      return {
        w: Number.parseFloat(s.width),
        h: Number.parseFloat(s.height),
        content: s.content,
      };
    });
    expect(after.content).not.toBe('none');
    expect(after.w).toBeCloseTo(0.425 * rootPx, 1);
    expect(after.h).toBeCloseTo(0.425 * rootPx, 1);
  });

  test('localStorage mode is applied without waiting for network idle', async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'legacy');
    }, DISPLAY_MODE_STORAGE_KEY);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    const checked = await page.evaluate(() => {
      const el = document.querySelector(
        'input[name="display-mode"]:checked',
      ) as HTMLInputElement | null;
      return el?.value ?? '';
    });
    expect(checked).toBe('legacy');
    await expect(page.locator('html')).toHaveClass(/display-legacy/);
  });

  test('invalid display-mode in localStorage falls back to standard', async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, '__not_a_real_mode__');
    }, DISPLAY_MODE_STORAGE_KEY);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    const checked = await page.evaluate(() => {
      const el = document.querySelector(
        'input[name="display-mode"]:checked',
      ) as HTMLInputElement | null;
      return el?.value ?? '';
    });
    expect(checked).toBe('standard');
    await expect(page.locator('html')).not.toHaveClass(/display-legacy/);
    await expect(page.locator('html')).not.toHaveClass(/display-legacy-strong/);
  });
});
