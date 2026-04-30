import { test, expect, type Page } from '@playwright/test';
import { RGB_INK } from '../src/constants/colors';
import {
  REVEAL_PADDING_RATIO_ASSERT_TOLERANCE_PX,
  REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX,
  REVEAL_RIGHT_MARGIN_RATIO_MIN,
  REVEAL_RIGHT_RENDER_PAD_PX,
} from '../src/utils/profile-reveal-constants';
import {
  countRevealRasterSignature,
  expectFoundationsRevealCopyPainted,
  gotoProfileWhenReady,
  mustBox,
  pathnameIsProfile,
} from './helpers';
import {
  PROFILE_SEAM_VIEWPORT_WIDTHS,
  PROFILE_SHARED_EDGE_RATIO_BY_STEP,
  activeProfileSeamRatio,
  expectedProfileStitchedBorderPx,
} from './profile-seam-ratios';

/** Chromium often reports whole CSS px for used border widths while calc() is fractional. */
function expectUsedBorderWidthInComputedRange(
  received: number,
  expectedFromCalc: number,
  msg: string,
) {
  const low = Math.floor(expectedFromCalc + 1e-6);
  const high = Math.ceil(expectedFromCalc - 1e-6);
  expect(received, msg).toBeGreaterThanOrEqual(low);
  expect(received, msg).toBeLessThanOrEqual(high);
}

type StaticProfileGeometry = {
  columnHeight: number;
  foundationsHeight: number;
  portraitTop: number;
  portraitRight: number;
  portraitBottomGapToFoundations: number;
};

async function readStaticProfileGeometry(
  page: Page,
): Promise<StaticProfileGeometry> {
  return page.evaluate(() => {
    const col = document.querySelector('.profile-right-column');
    const tile = document.querySelector('.prof-tile--foundations');
    const shell = document.querySelector('.profile-photo-shell');
    if (!(col instanceof HTMLElement))
      throw new Error('missing .profile-right-column');
    if (!(tile instanceof HTMLElement))
      throw new Error('missing .prof-tile--foundations');
    if (!(shell instanceof HTMLElement))
      throw new Error('missing .profile-photo-shell');

    const colRect = col.getBoundingClientRect();
    const tileRect = tile.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const foundationsTop = tileRect.top - colRect.top;

    return {
      columnHeight: colRect.height,
      foundationsHeight: tileRect.height,
      portraitTop: shellRect.top - colRect.top,
      portraitRight: colRect.right - shellRect.right,
      portraitBottomGapToFoundations:
        foundationsTop - shellRect.bottom + colRect.top,
    };
  });
}

async function setRevealTimeoutMs(page: Page, ms: number): Promise<void> {
  await page.evaluate((timeout) => {
    const tile = document.querySelector(
      '.prof-tile--foundations',
    ) as HTMLElement | null;
    if (!tile) throw new Error('missing .prof-tile--foundations');
    tile.style.setProperty('--profile-reveal-timeout-ms', `${timeout}`);
  }, ms);
}

async function openFoundationsReveal(tile: ReturnType<Page['getByRole']>) {
  await tile.click();
  await expect(tile).toHaveClass(/is-revealed/);
  await expect(tile).toHaveClass(/is-reveal-typefit-ready/);
  await expectFoundationsRevealCopyPainted(tile);
}

test.describe('/profile — type fit, Foundations tile, reveal', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
  });

  test('applies --profile-tile-label-font-size on section after type fit', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const raw = await page
      .locator('.profile-section')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--profile-tile-label-font-size'),
      );
    expect(raw.trim()).toMatch(/px$/);
    expect(parseFloat(raw)).toBeGreaterThan(0);
  });

  test('applies --profile-reveal-font-size on Foundations reveal after type fit', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await openFoundationsReveal(tile);
    const { revealPx, labelPx } = await page.evaluate(() => {
      const section = document.querySelector('.profile-section');
      const reveal = document.querySelector(
        '.prof-tile--foundations .prof-tile__reveal',
      );
      if (!(section instanceof HTMLElement))
        throw new Error('missing .profile-section');
      if (!(reveal instanceof HTMLElement))
        throw new Error('missing foundations reveal node');
      const revealRaw = getComputedStyle(reveal)
        .getPropertyValue('--profile-reveal-font-size')
        .trim();
      const labelRaw = getComputedStyle(section)
        .getPropertyValue('--profile-tile-label-font-size')
        .trim();
      return {
        revealPx: Number.parseFloat(revealRaw),
        labelPx: Number.parseFloat(labelRaw),
      };
    });
    expect(labelPx).toBeGreaterThan(0);
    // Zero would mean collapsed `em` copy (black tile, no readable text); see openFoundationsReveal().
    expect(revealPx).toBeGreaterThan(0);
    expect(revealPx).toBeLessThan(labelPx);
  });

  test('Foundations tile targets /foundations and uses foundations modifier', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await expect(tile).toHaveAttribute('href', '/foundations');
    await expect(tile).toHaveClass(/prof-tile--foundations/);
  });

  test('first click opens reveal and stays on /profile', async ({ page }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await openFoundationsReveal(tile);
    await expect(page).toHaveURL(/\/profile\/?$/);
    await expect(tile.locator('.prof-tile__reveal')).toContainText(
      /Writing\s*might\s*be\s*the\s*better\s*place\s*to\s*look/i,
    );
  });

  test('Foundations state2 reveal screenshot mixes #111 panel with page-wash ink', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await openFoundationsReveal(tile);
    const box = await tile.boundingBox();
    expect(box, 'Foundations tile must have a layout box').toBeTruthy();
    const domDims = await tile.evaluate((el) => {
      if (!(el instanceof HTMLElement)) return null;
      return {
        clientW: el.clientWidth,
        clientH: el.clientHeight,
        rectW: Math.round(el.getBoundingClientRect().width),
        rectH: Math.round(el.getBoundingClientRect().height),
      };
    });
    expect(domDims).toBeTruthy();
    // Only the Foundations `<a>` — Playwright clips to that element’s border box, never siblings.
    // `scale: 'css'` keeps PNG pixel size aligned to CSS layout (not DPR-expanded viewport).
    const pngBuffer = await tile.screenshot({
      animations: 'disabled',
      scale: 'css',
    });
    const sig = countRevealRasterSignature(pngBuffer);
    for (const [label, css, pngDim] of [
      ['width', domDims!.clientW, sig.width],
      ['height', domDims!.clientH, sig.height],
    ] as const) {
      expect(
        Math.abs(pngDim - css),
        `PNG ${label} ${pngDim} must match tile client${label === 'width' ? 'Width' : 'Height'} ${css} (tile-only crop)`,
      ).toBeLessThanOrEqual(1);
    }
    expect(
      Math.abs(sig.width - domDims!.rectW),
      'PNG width should match rounded getBoundingClientRect()',
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(sig.height - domDims!.rectH),
      'PNG height should match rounded getBoundingClientRect()',
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(sig.width - Math.round(box!.width)),
      `PNG width ${sig.width} should match Playwright boundingBox width ~${Math.round(box!.width)}`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(sig.height - Math.round(box!.height)),
      `PNG height ${sig.height} should match Playwright boundingBox height ~${Math.round(box!.height)}`,
    ).toBeLessThanOrEqual(1);
    // A frame just inside the physical image edge must be #111 (outer 1-2 px are often AA corner blends).
    expect(
      sig.insetRimBlackRatio,
      'inside the crop edge the frame should be predominantly panel black #111 (not surrounding page)',
    ).toBeGreaterThanOrEqual(0.92);
    const area = sig.width * sig.height;
    expect(
      sig.opaque,
      'element screenshot should be mostly opaque',
    ).toBeGreaterThan(area * 0.5);
    expect(
      sig.panelBlack / area,
      'state2 panel should include large #111 regions',
    ).toBeGreaterThan(0.22);
    const minInk = Math.max(100, area * 0.001);
    expect(
      sig.pageWashInk,
      `raster should include pixels near page text wash #e0f7fa (anti-alias), got ${sig.pageWashInk}, need >= ${minInk}`,
    ).toBeGreaterThanOrEqual(minInk);
  });

  test('Foundations reveal copy uses two-tier stanza layout and scaled subcopy', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await openFoundationsReveal(tile);

    const layout = await page.evaluate(() => {
      const reveal = document.querySelector(
        '.prof-tile--foundations .prof-tile__reveal',
      );
      const copy = document.querySelector(
        '.prof-tile--foundations .tile-state-secondary',
      );
      const stanzas = Array.from(
        document.querySelectorAll(
          '.prof-tile--foundations .tile-state-secondary .line-1, .prof-tile--foundations .tile-state-secondary .line-2',
        ),
      );
      if (!(reveal instanceof HTMLElement))
        throw new Error('missing foundations reveal node');
      if (!(copy instanceof HTMLElement))
        throw new Error('missing foundations tile-state-secondary node');
      if (stanzas.length < 2) throw new Error('expected line-1 and line-2');
      const [primary, secondary] = stanzas as HTMLElement[];
      const revealCs = getComputedStyle(reveal);
      const copyCs = getComputedStyle(copy);
      const inner = copy.querySelector('.tile-state-secondary__inner');
      const gapSource = inner instanceof HTMLElement ? inner : copy;
      const primaryCs = getComputedStyle(primary);
      const secondaryCs = getComputedStyle(secondary);
      const primaryPx = Number.parseFloat(primaryCs.fontSize);
      const secondaryPx = Number.parseFloat(secondaryCs.fontSize);
      const copyGapPx = Number.parseFloat(getComputedStyle(gapSource).gap) || 0;
      const primaryLeft = primary.getBoundingClientRect().left;
      const secondaryLeft = secondary.getBoundingClientRect().left;
      const revealRect = reveal.getBoundingClientRect();
      const primaryRect = primary.getBoundingClientRect();
      const primaryLeftMarginPx = primaryRect.left - revealRect.left;
      const primaryRightMarginPx = revealRect.right - primaryRect.right;
      const revealIconCount = document.querySelectorAll(
        '.prof-tile--foundations .prof-tile__reveal-icon',
      ).length;
      const copyAnimName = copyCs.animationName;
      return {
        revealPadL: Number.parseFloat(revealCs.paddingLeft) || 0,
        revealPadR: Number.parseFloat(revealCs.paddingRight) || 0,
        copyClass: copy.className,
        copyTextAlign: copyCs.textAlign,
        primaryText: primary.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        secondaryText: secondary.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        primaryPx,
        secondaryPx,
        copyGapPx,
        primaryLeft,
        secondaryLeft,
        primaryLeftMarginPx,
        primaryRightMarginPx,
        revealIconCount,
        copyAnimName,
      };
    });

    expect(layout.revealPadL).toBeGreaterThanOrEqual(14);
    expect(layout.revealPadL).toBeLessThanOrEqual(70);
    expect(layout.revealPadR).toBeGreaterThanOrEqual(
      layout.revealPadL * REVEAL_RIGHT_MARGIN_RATIO_MIN -
        REVEAL_PADDING_RATIO_ASSERT_TOLERANCE_PX,
    );
    expect(layout.copyClass).toContain('tile-state-secondary');
    expect(layout.copyTextAlign).toBe('left');
    expect(layout.primaryText).toMatch(
      /Writing\s*might\s*be\s*the\s*better\s*place\s*to\s*look/i,
    );
    expect(layout.secondaryText).toMatch(/Still,\s*step\s*in\s*here\.?/i);
    expect(layout.primaryPx).toBeGreaterThanOrEqual(0);
    expect(layout.secondaryPx).toBeGreaterThanOrEqual(0);
    if (layout.primaryPx > 0) {
      /* line-2 / line-1 rem sizes in profile.css (0.67rem / 0.76rem) */
      expect(layout.secondaryPx / layout.primaryPx).toBeGreaterThan(0.84);
      expect(layout.secondaryPx / layout.primaryPx).toBeLessThan(0.92);
    } else {
      expect(layout.secondaryPx).toBe(0);
    }
    expect(layout.copyGapPx).toBeGreaterThan(2);
    expect(layout.copyGapPx).toBeLessThan(12);
    expect(Math.abs(layout.primaryLeft - layout.secondaryLeft)).toBeLessThan(
      1.5,
    );
    expect(
      layout.primaryRightMarginPx + REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX,
    ).toBeGreaterThanOrEqual(
      layout.primaryLeftMarginPx * REVEAL_RIGHT_MARGIN_RATIO_MIN +
        REVEAL_RIGHT_RENDER_PAD_PX,
    );
    expect(layout.revealIconCount).toBe(0);
    expect(layout.copyAnimName).toBe('none');
  });

  test('second click while revealed navigates to /foundations', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await openFoundationsReveal(tile);
    await tile.click();
    await expect(page).toHaveURL(/\/foundations\/?$/);
  });

  test('portrait lives in photo frame with inset photo box', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const frame = page.locator('.profile-photo-frame');
    const box = page.locator('.profile-photo-frame .profile-photo-box');
    await expect(frame).toBeVisible();
    await expect(box).toBeVisible();
    const inner = await mustBox(box);
    const outer = await mustBox(frame);
    expect(inner.width).toBeLessThanOrEqual(outer.width);
    expect(inner.height).toBeLessThanOrEqual(outer.height);
  });

  test('profile section seam ratio custom props match e2e/profile-seam-ratios.ts', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoProfileWhenReady(page);
    const fromDom = await page.evaluate(() => {
      const s = document.querySelector('.profile-section');
      if (!(s instanceof HTMLElement))
        throw new Error('missing .profile-section');
      const cs = getComputedStyle(s);
      return {
        base: Number.parseFloat(
          cs.getPropertyValue('--profile-shared-edge-ratio-base').trim(),
        ),
        at360: Number.parseFloat(
          cs.getPropertyValue('--profile-shared-edge-ratio-360').trim(),
        ),
        at480: Number.parseFloat(
          cs.getPropertyValue('--profile-shared-edge-ratio-480').trim(),
        ),
        at720: Number.parseFloat(
          cs.getPropertyValue('--profile-shared-edge-ratio-720').trim(),
        ),
        at960: Number.parseFloat(
          cs.getPropertyValue('--profile-shared-edge-ratio-960').trim(),
        ),
      };
    });
    const e = PROFILE_SHARED_EDGE_RATIO_BY_STEP;
    expect(fromDom.base).toBeCloseTo(e.base, 5);
    expect(fromDom.at360).toBeCloseTo(e.at360, 5);
    expect(fromDom.at480).toBeCloseTo(e.at480, 5);
    expect(fromDom.at720).toBeCloseTo(e.at720, 5);
    expect(fromDom.at960).toBeCloseTo(e.at960, 5);
  });

  test('profile stitched seam width follows ratio steps by viewport', async ({
    page,
  }) => {
    for (const width of PROFILE_SEAM_VIEWPORT_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      /*
       * Chromium can leave `border-bottom-width` on the Why this tile stale after a viewport
       * resize even when inherited `--profile-*` vars on `.profile-section` already match
       * the new @media step — `getComputedStyle` shows an updated ratio but an old used
       * border. Reload when already on /profile so each width is a fresh style resolve.
       */
      if (pathnameIsProfile(page.url())) {
        await page.reload({ waitUntil: 'load' });
      }
      await gotoProfileWhenReady(page);
      const { framePx, stitchedPx, innerW } = await page.evaluate(() => {
        const section = document.querySelector('.profile-section');
        const why = document.querySelector(
          'a.prof-tile[href="/why-this"]',
        ) as HTMLElement | null;
        if (!(section instanceof HTMLElement) || !why) {
          throw new Error('missing profile Why this tile or section');
        }
        const frame = Number.parseFloat(
          getComputedStyle(section)
            .getPropertyValue('--profile-photo-frame-size')
            .trim(),
        );
        const stitched = Number.parseFloat(
          getComputedStyle(why).borderBottomWidth,
        );
        return {
          framePx: frame,
          stitchedPx: stitched,
          innerW: window.innerWidth,
        };
      });
      const ratio = activeProfileSeamRatio(innerW);
      const expected = expectedProfileStitchedBorderPx(framePx, ratio);
      expectUsedBorderWidthInComputedRange(
        stitchedPx,
        expected,
        `innerWidth ${innerW}px (set ${width}px), ratio ${ratio}`,
      );
    }
  });

  test('profile tile borders follow configured frame thickness with border-box sizing', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const info = await page.evaluate(() => {
      const section = document.querySelector('.profile-section');
      const tiles = Array.from(
        document.querySelectorAll('.prof-tile'),
      ) as HTMLElement[];
      if (!(section instanceof HTMLElement))
        throw new Error('missing .profile-section');
      if (tiles.length === 0) throw new Error('missing .prof-tile');
      const sectionCs = getComputedStyle(section);
      const frameVar = Number.parseFloat(
        sectionCs.getPropertyValue('--profile-photo-frame-size').trim(),
      );
      const whyTile = document.querySelector(
        'a.prof-tile[href="/why-this"]',
      ) as HTMLElement | null;
      const stitchedVar = whyTile
        ? Number.parseFloat(getComputedStyle(whyTile).borderBottomWidth) || 0
        : 0;
      const tileData = tiles.map((tile) => {
        const cs = getComputedStyle(tile);
        const href = tile.getAttribute('href') ?? '';
        return {
          href,
          isFoundations: tile.classList.contains('prof-tile--foundations'),
          boxSizing: cs.boxSizing,
          borderTop: Number.parseFloat(cs.borderTopWidth) || 0,
          borderRight: Number.parseFloat(cs.borderRightWidth) || 0,
          borderBottom: Number.parseFloat(cs.borderBottomWidth) || 0,
          borderLeft: Number.parseFloat(cs.borderLeftWidth) || 0,
          borderColor: cs.borderTopColor,
        };
      });
      return { frameVar, stitchedVar, tileData };
    });

    expect(info.frameVar).toBeGreaterThanOrEqual(0);
    expect(info.stitchedVar).toBeGreaterThanOrEqual(0);
    for (const tile of info.tileData) {
      expect(tile.boxSizing).toBe('border-box');
      expect(tile.borderTop).toBeCloseTo(info.frameVar, 1);
      expect(tile.borderRight).toBeCloseTo(info.frameVar, 1);
      const bottomExpect =
        tile.href === '/why-this' ? info.stitchedVar : info.frameVar;
      const leftExpect = tile.isFoundations ? info.stitchedVar : info.frameVar;
      expect(tile.borderBottom).toBeCloseTo(bottomExpect, 1);
      expect(tile.borderLeft).toBeCloseTo(leftExpect, 1);
      expect(tile.borderColor).toBe(RGB_INK);
    }
  });

  test('state1 hover keeps Foundations tile tone stable (label-only change)', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await expect(tile).not.toHaveClass(/is-revealed/);

    const readFoundationsHoverState = async () =>
      page.evaluate(() => {
        const tile = document.querySelector(
          'a.prof-tile--foundations',
        ) as HTMLElement | null;
        if (!(tile instanceof HTMLElement))
          throw new Error('missing Foundations profile tile');
        const text = tile.querySelector('.page-button__text');
        const bg = tile.querySelector('.page-button__bg');
        const overlay = tile.querySelector('.page-button__overlay');
        if (!(text instanceof HTMLElement))
          throw new Error('missing .page-button__text');
        if (!(bg instanceof HTMLElement))
          throw new Error('missing .page-button__bg');
        if (!(overlay instanceof HTMLElement))
          throw new Error('missing .page-button__overlay');

        const textBefore = getComputedStyle(text, '::before');
        const probe = document.createElement('span');
        probe.style.color = 'var(--color-page-bg)';
        document.body.appendChild(probe);
        const pageBgColorResolved = getComputedStyle(probe).color;
        probe.remove();

        return {
          hoverCapable: window.matchMedia('(hover: hover)').matches,
          bgColor: getComputedStyle(bg).backgroundColor,
          overlayBg: getComputedStyle(overlay).backgroundImage,
          textColor: getComputedStyle(text).color,
          textBeforeLeft: textBefore.left,
          textBeforeRight: textBefore.right,
          pageBgColorResolved,
        };
      });

    const before = await readFoundationsHoverState();
    expect(before.textColor).toBe(RGB_INK);

    await tile.hover();
    const after = await readFoundationsHoverState();

    if (!after.hoverCapable) return;

    // Tile tone must remain stable on Foundations hover (no full-tile darken/glint).
    expect(after.bgColor).toBe(before.bgColor);
    expect(after.overlayBg).toBe('none');
    // Label stays hover-readable and rectangle is constrained around text, not full width.
    expect(after.textColor).toBe(before.textColor);
    const hasInlineRevealChip =
      after.textBeforeLeft !== '-1000px' || after.textBeforeRight !== '-1000px';
    expect(hasInlineRevealChip).toBe(true);
    expect(before.pageBgColorResolved).toBeTruthy();
  });

  test('portrait stays right-anchored and Foundations remains below it across viewport resize', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);

    const assertStaticLayout = async () => {
      await expect
        .poll(
          async () => {
            const g = await readStaticProfileGeometry(page);
            const lowerHalfThreshold = g.columnHeight * 0.28;
            return (
              g.foundationsHeight >= lowerHalfThreshold &&
              g.portraitTop >= 0 &&
              g.portraitTop <= g.columnHeight * 0.5 &&
              Math.abs(g.portraitRight) < 2.5 &&
              g.portraitBottomGapToFoundations > 0
            );
          },
          { timeout: 2500, intervals: [100, 200, 350] },
        )
        .toBe(true);
    };

    await assertStaticLayout();
    await page.setViewportSize({ width: 980, height: 700 });
    await assertStaticLayout();
    await page.setViewportSize({ width: 1440, height: 980 });
    await assertStaticLayout();
  });

  test('reveal timeout returns classes to default without shape changes', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    await setRevealTimeoutMs(page, 900);
    const tile = page.getByRole('link', { name: 'Foundations' });
    const before = await readStaticProfileGeometry(page);
    await openFoundationsReveal(tile);

    await expect
      .poll(
        async () => {
          const cls = (await tile.getAttribute('class')) ?? '';
          return cls.includes('is-revealed');
        },
        { timeout: 2500, intervals: [100, 200, 350] },
      )
      .toBe(false);

    const after = await readStaticProfileGeometry(page);
    expect(
      Math.abs(after.foundationsHeight - before.foundationsHeight),
    ).toBeLessThan(2.5);
    expect(Math.abs(after.portraitTop - before.portraitTop)).toBeLessThan(2.5);
    expect(Math.abs(after.portraitRight - before.portraitRight)).toBeLessThan(
      2.5,
    );
  });

  test('rapid resize and reveal interactions do not leave stuck reveal classes', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    await setRevealTimeoutMs(page, 550);
    const tile = page.locator('a.prof-tile--foundations').first();

    const viewports = [
      { width: 1200, height: 860 },
      { width: 980, height: 700 },
      { width: 1360, height: 900 },
      { width: 1100, height: 760 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expect(page).toHaveURL(/\/profile\/?$/);
      await expect(tile).toBeVisible();
      await expect
        .poll(
          async () => {
            const cls = (await tile.getAttribute('class')) ?? '';
            return cls.includes('is-revealed');
          },
          { timeout: 2000, intervals: [80, 140, 220] },
        )
        .toBe(false);
      await tile.click();
      await expect(tile).toHaveClass(/is-revealed/);
      await expectFoundationsRevealCopyPainted(tile);
    }

    await expect
      .poll(
        async () => {
          const cls = (await tile.getAttribute('class')) ?? '';
          return {
            revealed: cls.includes('is-revealed'),
            opening: cls.includes('is-reveal-opening'),
            fading: cls.includes('is-reveal-fading-out'),
            ready: cls.includes('is-reveal-typefit-ready'),
          };
        },
        { timeout: 3000, intervals: [100, 200, 350] },
      )
      .toEqual({
        revealed: false,
        opening: false,
        fading: false,
        ready: expect.any(Boolean),
      });
  });
});
