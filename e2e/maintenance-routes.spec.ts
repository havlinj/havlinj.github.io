import { expect, test } from '@playwright/test';
import { RGB_INK, RGB_PAGE_BG } from '../src/constants/colors';
import {
  MAINTENANCE_PANEL_BG,
  MAINTENANCE_PANEL_BG_STEM,
} from '../src/constants/maintenance-panel';

test.describe('maintenance routes fixture', () => {
  test('writing shows Whoops notice inside the content panel', async ({
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
      (el) => getComputedStyle(el, '::before').backgroundColor,
    );
    expect(bandBg).toBe(RGB_PAGE_BG);

    const layout = await page.evaluate(() => {
      const contentPanel = document.querySelector('.route-maintenance-panel');
      const plate = document.querySelector('.route-maintenance-panel__copy');
      const headline = document.querySelector(
        '.route-maintenance-panel__headline',
      );
      const info = document.querySelector('.route-maintenance-panel__info');
      if (
        !(contentPanel instanceof HTMLElement) ||
        !(plate instanceof HTMLElement) ||
        !(headline instanceof HTMLElement) ||
        !(info instanceof HTMLElement)
      ) {
        return null;
      }
      const panelBox = contentPanel.getBoundingClientRect();
      const plateBox = plate.getBoundingClientRect();
      const headlineBox = headline.getBoundingClientRect();
      const infoBox = info.getBoundingClientRect();
      return {
        rightGap: panelBox.right - plateBox.right,
        rightBleedPx: plateBox.right - panelBox.right,
        leftPad: headlineBox.left - plateBox.left,
        topPad: headlineBox.top - plateBox.top,
        bottomPad: plateBox.bottom - infoBox.bottom,
        contentPanelCenterY: panelBox.top + panelBox.height / 2,
        plateCenterY: plateBox.top + plateBox.height / 2,
        panelBorder: getComputedStyle(contentPanel).borderWidth,
      };
    });
    expect(layout).not.toBeNull();
    expect(layout!.rightGap).toBeLessThan(2);
    expect(layout!.rightBleedPx).toBeGreaterThanOrEqual(-1);
    expect(layout!.rightBleedPx).toBeLessThan(2);
    expect(layout!.leftPad).toBeGreaterThan(8);
    expect(layout!.leftPad).toBeLessThan(40);
    expect(layout!.topPad).toBeGreaterThan(12);
    expect(layout!.bottomPad).toBeGreaterThan(12);
    expect(
      Math.abs(layout!.plateCenterY - layout!.contentPanelCenterY),
    ).toBeLessThan(2);
    expect(layout!.panelBorder).toBe('0px');
  });

  test('writing panel edge styles stay page-bg during doc zoom (no ink ring)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/writing');
    await page.locator('.route-maintenance-panel').waitFor();

    for (const z of [1, 1.25, 1.5, 1.75, 2, 2.3, 2.5]) {
      await page.evaluate((zoom) => {
        document.documentElement.style.zoom = String(zoom);
        window.dispatchEvent(new Event('resize'));
      }, z);
      await page.waitForTimeout(120);

      const styles = await page.evaluate(
        ({ ink, pageBg }) => {
          const panel = document.querySelector('.route-maintenance-panel');
          if (!(panel instanceof HTMLElement)) return null;
          const cs = getComputedStyle(panel);
          const before = getComputedStyle(panel, '::before');
          return {
            panelBg: cs.backgroundColor,
            paddingTop: cs.paddingTop,
            beforeDisplay: before.display,
            beforeBg: before.backgroundColor,
            beforeOpacity: before.opacity,
            inkMatch: cs.backgroundColor === ink,
            pageBgMatch: cs.backgroundColor === pageBg,
          };
        },
        { ink: RGB_INK, pageBg: RGB_PAGE_BG },
      );

      expect(styles, `zoom=${z}`).not.toBeNull();
      expect(styles!.inkMatch, `zoom=${z} panel bg`).toBe(false);
      expect(styles!.pageBgMatch, `zoom=${z} panel bg`).toBe(true);
      expect(styles!.paddingTop, `zoom=${z} padding`).toBe('0px');
      expect(styles!.beforeDisplay, `zoom=${z} ::before`).toBe('none');

      const mediaInset = await page.evaluate(() => {
        const media = document.querySelector(
          '.route-maintenance-page .page-buttons-panel__media',
        );
        if (!(media instanceof HTMLElement)) return null;
        const cs = getComputedStyle(media);
        return {
          top: cs.top,
          bg: cs.backgroundColor,
        };
      });
      expect(mediaInset?.top, `zoom=${z} media overscan`).toBe('-1px');
      expect(mediaInset?.bg, `zoom=${z} media underlay`).toBe(RGB_PAGE_BG);

      const copyEdge = await page.evaluate(() => {
        const panel = document.querySelector('.route-maintenance-panel');
        const copy = document.querySelector('.route-maintenance-panel__copy');
        if (!(panel instanceof HTMLElement) || !(copy instanceof HTMLElement)) {
          return null;
        }
        const panelBox = panel.getBoundingClientRect();
        const copyBox = copy.getBoundingClientRect();
        return {
          rightGap: panelBox.right - copyBox.right,
          rightBleedPx: copyBox.right - panelBox.right,
          beforeBg: getComputedStyle(copy, '::before').backgroundColor,
        };
      });
      expect(copyEdge, `zoom=${z} copy edge`).not.toBeNull();
      expect(copyEdge!.rightGap, `zoom=${z} copy right gap`).toBeLessThan(2);
      expect(
        copyEdge!.rightBleedPx,
        `zoom=${z} copy right bleed`,
      ).toBeGreaterThanOrEqual(-1);
      expect(copyEdge!.beforeBg, `zoom=${z} copy fill`).toBe(RGB_PAGE_BG);
    }

    await page.mouse.wheel(0, -120);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -120);
    await page.keyboard.up('Control');
    await page.waitForTimeout(200);

    const afterWheel = await page.evaluate(
      ({ ink, pageBg }) => {
        const panel = document.querySelector('.route-maintenance-panel');
        if (!(panel instanceof HTMLElement)) return null;
        const cs = getComputedStyle(panel);
        const before = getComputedStyle(panel, '::before');
        return {
          panelBg: cs.backgroundColor,
          beforeDisplay: before.display,
          inkMatch: cs.backgroundColor === ink,
          pageBgMatch: cs.backgroundColor === pageBg,
        };
      },
      { ink: RGB_INK, pageBg: RGB_PAGE_BG },
    );
    expect(afterWheel?.inkMatch).toBe(false);
    expect(afterWheel?.pageBgMatch).toBe(true);
    expect(afterWheel?.beforeDisplay).toBe('none');
  });

  test('writing panel uses page background on first paint (no ink flash)', async ({
    page,
  }) => {
    await page.goto('/writing', { waitUntil: 'domcontentloaded' });

    const panel = page.locator('.route-maintenance-panel');
    await expect(panel).toBeAttached();

    const bg = await panel.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toBe(RGB_PAGE_BG);

    const beforeDisplay = await panel.evaluate(
      (el) => getComputedStyle(el, '::before').display,
    );
    expect(beforeDisplay).toBe('none');
  });

  test('panel media reveals after edge sync (no background shift flash)', async ({
    page,
  }) => {
    await page.goto('/writing');
    const media = page.locator(
      '.route-maintenance-page .page-buttons-panel__media',
    );
    await expect(media).toBeAttached();
    await expect
      .poll(
        async () =>
          media.evaluate((el) => ({
            pending: el.classList.contains(
              'route-maintenance-panel__media--pending',
            ),
            visible: el.classList.contains(
              'route-maintenance-panel__media--visible',
            ),
            opacity: getComputedStyle(el).opacity,
          })),
        { timeout: 1200 },
      )
      .toEqual({ pending: false, visible: true, opacity: '1' });

    const edgePx = await page.evaluate(() => {
      const panel = document.querySelector('.route-maintenance-panel');
      if (!(panel instanceof HTMLElement)) return 0;
      const edge = panel.style.getPropertyValue(
        '--route-maintenance-panel-edge',
      );
      return Number.parseFloat(edge);
    });
    expect(edgePx).toBeGreaterThan(320);
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
    expect(knobs).toMatchObject({
      zoom: MAINTENANCE_PANEL_BG.zoom,
      opacity: MAINTENANCE_PANEL_BG.layerOpacity,
      posX: MAINTENANCE_PANEL_BG.posX,
      posY: MAINTENANCE_PANEL_BG.posY,
      nudgeX: MAINTENANCE_PANEL_BG.nudgeX,
      saturation: MAINTENANCE_PANEL_BG.saturation,
      brightness: MAINTENANCE_PANEL_BG.brightness,
      contrast: MAINTENANCE_PANEL_BG.contrast,
      rotate: MAINTENANCE_PANEL_BG.rotate,
    });
    expect(Number.parseFloat(knobs!.nudgeY)).toBeCloseTo(
      Number.parseFloat(MAINTENANCE_PANEL_BG.nudgeY),
      5,
    );

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
          .locator('.route-maintenance-page .page-buttons-panel__media')
          .evaluate((el) => ({
            imageReady: (() => {
              const img = el.querySelector('img') as HTMLImageElement | null;
              return !!img && img.complete && img.naturalWidth > 0;
            })(),
            visible: el.classList.contains(
              'route-maintenance-panel__media--visible',
            ),
          })),
      )
      .toEqual({ imageReady: true, visible: true });
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
