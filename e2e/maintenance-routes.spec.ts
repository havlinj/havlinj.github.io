import { expect, test } from '@playwright/test';
import { RGB_PAGE_BG } from '../src/constants/colors';
import {
  MAINTENANCE_PANEL_BG,
  MAINTENANCE_PANEL_BG_STEM,
} from '../src/constants/maintenance-panel';

test.describe('maintenance routes fixture', () => {
  test('writing shows Whoops notice inside the square panel', async ({
    page,
  }) => {
    await page.goto('/writing');

    await expect(page.locator('.site-header')).toBeVisible();
    await expectNavActive(page, 'Writing');
    await expect(page.getByRole('heading', { name: 'Whoops' })).toBeVisible();

    const panel = page.locator('.route-maintenance-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('.route-maintenance-panel__route')).toHaveText(
      '/writing',
    );
    await expect(page.locator('.route-maintenance-panel__date')).toHaveText(
      'Started on 26.08.07.',
    );
    await expect(page.getByText('Content will return soon.')).toBeVisible();

    await expect(page.locator('.writing-category-picker')).toHaveCount(0);

    const bg = await panel.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toBe(RGB_PAGE_BG);

    const band = page.locator('.route-maintenance-panel__copy');
    await expect(band).toBeVisible();
    const bandBg = await band.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bandBg).toBe(RGB_PAGE_BG);

    const layout = await page.evaluate(() => {
      const square = document.querySelector('.route-maintenance-panel');
      const plate = document.querySelector('.route-maintenance-panel__copy');
      const headline = document.querySelector(
        '.route-maintenance-panel__headline',
      );
      const info = document.querySelector('.route-maintenance-panel__info');
      if (
        !(square instanceof HTMLElement) ||
        !(plate instanceof HTMLElement) ||
        !(headline instanceof HTMLElement) ||
        !(info instanceof HTMLElement)
      ) {
        return null;
      }
      const squareBox = square.getBoundingClientRect();
      const plateBox = plate.getBoundingClientRect();
      const headlineBox = headline.getBoundingClientRect();
      const infoBox = info.getBoundingClientRect();
      return {
        rightGap: Math.abs(squareBox.right - plateBox.right),
        leftPad: headlineBox.left - plateBox.left,
        topPad: headlineBox.top - plateBox.top,
        bottomPad: plateBox.bottom - infoBox.bottom,
        squareCenterY: squareBox.top + squareBox.height / 2,
        plateCenterY: plateBox.top + plateBox.height / 2,
        panelBorder: getComputedStyle(square).borderWidth,
      };
    });
    expect(layout).not.toBeNull();
    expect(layout!.rightGap).toBeLessThan(2);
    expect(layout!.leftPad).toBeGreaterThan(8);
    expect(layout!.leftPad).toBeLessThan(40);
    expect(layout!.topPad).toBeGreaterThan(12);
    expect(layout!.bottomPad).toBeGreaterThan(12);
    expect(Math.abs(layout!.plateCenterY - layout!.squareCenterY)).toBeLessThan(
      2,
    );
    expect(layout!.panelBorder).toBe('0px');
  });

  test('writing panel locks dichrom media and panel-bg knobs', async ({
    page,
  }) => {
    await page.goto('/writing');

    const mediaImg = page.locator(
      '.route-maintenance-page .page-buttons-panel__media img',
    );
    await expect(mediaImg).toBeAttached();
    await expect
      .poll(async () =>
        mediaImg.evaluate((el) => {
          const img = el as HTMLImageElement;
          return img.complete && img.naturalWidth > 0;
        }),
      )
      .toBe(true);

    const src = await mediaImg.evaluate((el) => {
      const img = el as HTMLImageElement;
      return img.currentSrc || img.getAttribute('src') || '';
    });
    expect(src).toContain(MAINTENANCE_PANEL_BG_STEM);

    const knobs = await page.evaluate(() => {
      const pageEl = document.querySelector('.route-maintenance-page');
      if (!(pageEl instanceof HTMLElement)) return null;
      const cs = getComputedStyle(pageEl);
      return {
        zoom: cs.getPropertyValue('--panel-bg-zoom').trim(),
        opacity: cs.getPropertyValue('--panel-bg-layer-opacity').trim(),
        posX: cs.getPropertyValue('--panel-bg-pos-x').trim(),
        posY: cs.getPropertyValue('--panel-bg-pos-y').trim(),
        nudgeX: cs.getPropertyValue('--panel-bg-nudge-x').trim(),
        nudgeY: cs.getPropertyValue('--panel-bg-nudge-y').trim(),
        saturation: cs.getPropertyValue('--panel-bg-saturation').trim(),
        brightness: cs.getPropertyValue('--panel-bg-brightness').trim(),
        contrast: cs.getPropertyValue('--panel-bg-contrast').trim(),
        rotate: cs.getPropertyValue('--panel-bg-rotate').trim(),
      };
    });
    expect(knobs).toEqual({
      zoom: MAINTENANCE_PANEL_BG.zoom,
      opacity: MAINTENANCE_PANEL_BG.layerOpacity,
      posX: MAINTENANCE_PANEL_BG.posX,
      posY: MAINTENANCE_PANEL_BG.posY,
      nudgeX: MAINTENANCE_PANEL_BG.nudgeX,
      nudgeY: MAINTENANCE_PANEL_BG.nudgeY,
      saturation: MAINTENANCE_PANEL_BG.saturation,
      brightness: MAINTENANCE_PANEL_BG.brightness,
      contrast: MAINTENANCE_PANEL_BG.contrast,
      rotate: MAINTENANCE_PANEL_BG.rotate,
    });

    const imgBox = await mediaImg.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        opacity: cs.opacity,
        widthPx: (el as HTMLElement).getBoundingClientRect().width,
        panelWidthPx:
          el.closest('.route-maintenance-panel')?.getBoundingClientRect()
            .width ?? 0,
      };
    });
    expect(Number.parseFloat(imgBox.opacity)).toBeCloseTo(
      Number.parseFloat(MAINTENANCE_PANEL_BG.layerOpacity),
      2,
    );
    expect(imgBox.widthPx).toBeGreaterThan(imgBox.panelWidthPx * 1.05);
  });

  test('writing Whoops panel visual snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/writing');
    const panel = page.locator('.route-maintenance-panel');
    await expect(panel).toBeVisible();
    await expect
      .poll(async () =>
        page
          .locator('.route-maintenance-page .page-buttons-panel__media img')
          .evaluate((el) => {
            const img = el as HTMLImageElement;
            return img.complete && img.naturalWidth > 0;
          }),
      )
      .toBe(true);
    await page.waitForTimeout(80);
    await expect(panel).toHaveScreenshot('route-maintenance-panel.png', {
      animations: 'disabled',
      maxDiffPixels: 6000,
    });
  });

  test('exact /contact is unavailable but /contact/form stays live', async ({
    page,
  }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: 'Whoops' })).toBeVisible();
    await expect(page.locator('.route-maintenance-panel__route')).toHaveText(
      '/contact',
    );
    await expect(page.locator('.route-maintenance-panel__date')).toHaveText(
      'Started on 26.08.08.',
    );

    await page.goto('/contact/form');
    await expect(page.getByRole('heading', { name: 'Whoops' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible();
  });

  test('unlisted profile route stays available', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Whoops' })).toHaveCount(0);
    await expect(page.locator('.profile-section')).toBeVisible();
  });
});

async function expectNavActive(
  page: import('@playwright/test').Page,
  label: string,
): Promise<void> {
  const link = page
    .locator('.site-header__inner')
    .getByRole('link', { name: label });
  await expect(link).toHaveClass(/site-nav__link--active/);
}
