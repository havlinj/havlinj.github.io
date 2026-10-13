import { expect, test } from '@playwright/test';
import {
  RECONSTRUCTION_HEADLINE_TAIL,
  RECONSTRUCTION_RETURN_LINE,
} from '../src/constants/maintenance-panel';

const configPath = process.env.MAINTENANCE_CONFIG_PATH ?? '';
const isReconstructionFixture = configPath
  .split(/[/\\]/)
  .includes('maintenance-reconstruction.json');

test.describe('maintenance reconstruction fixture', () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(
      !isReconstructionFixture,
      'requires e2e/fixtures/maintenance-reconstruction.json',
    );
  });

  test('home shows the new-look panel and other routes redirect', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: `The website ${RECONSTRUCTION_HEADLINE_TAIL}`,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(RECONSTRUCTION_RETURN_LINE, { exact: true }),
    ).toBeVisible();
    await expect(page.locator('footer.site-footer')).toHaveCount(0);
    await expect(page.locator('.site-header--reserved')).toBeAttached();
    await expect(page.locator('.site-header--reserved')).toBeHidden();

    const placement = await page.evaluate(() => {
      const copy = document.querySelector('.reconstruction-panel__copy');
      const panel = document.querySelector('.reconstruction-panel');
      if (!(copy instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
        return null;
      }
      const copyBox = copy.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const center = (copyBox.top + copyBox.bottom) / 2;
      return (center - panelBox.top) / panelBox.height;
    });
    expect(placement).not.toBeNull();
    expect(placement!).toBeGreaterThan(0.28);
    expect(placement!).toBeLessThan(0.4);

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByText(RECONSTRUCTION_RETURN_LINE, { exact: true }),
    ).toBeVisible();
  });

  test('reconstruction panel visual snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/');
    const panel = page.locator('.reconstruction-panel');
    await expect(panel).toBeVisible();
    await expect
      .poll(async () =>
        page
          .locator('.reconstruction-page .page-buttons-panel__media')
          .evaluate((el) => ({
            imageReady: (() => {
              const img = el.querySelector('img') as HTMLImageElement | null;
              return !!img && img.complete && img.naturalWidth > 0;
            })(),
            visible: el.classList.contains(
              'reconstruction-panel__media--visible',
            ),
          })),
      )
      .toEqual({ imageReady: true, visible: true });
    await page.waitForTimeout(80);
    await expect(panel).toHaveScreenshot('reconstruction-panel.png', {
      animations: 'disabled',
      maxDiffPixels: 6000,
    });
  });
});
