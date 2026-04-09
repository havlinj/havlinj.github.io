import { test, expect, type Page } from '@playwright/test';
import { RGB_INK } from '../src/constants/colors';
import {
  REVEAL_PADDING_RATIO_ASSERT_TOLERANCE_PX,
  REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX,
  REVEAL_RIGHT_MARGIN_RATIO_MIN,
  REVEAL_RIGHT_RENDER_PAD_PX,
} from '../src/utils/profile-reveal-constants';
import { gotoProfileWhenReady, mustBox } from './helpers';

type FoundationsGeometry = {
  columnHeight: number;
  foundationsHeight: number;
  portraitSide: number;
  portraitBottom: number;
  effectiveScale: number;
};

async function readFoundationsGeometry(
  page: Page,
): Promise<FoundationsGeometry> {
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

    const cs = getComputedStyle(col);
    const parseNum = (name: string): number => {
      const raw = cs.getPropertyValue(name).trim();
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    };
    const colRect = col.getBoundingClientRect();
    const tileRect = tile.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const portraitSidePxVar = parseNum('--profile-portrait-side-px');

    return {
      columnHeight: colRect.height,
      foundationsHeight: tileRect.height,
      portraitSide: portraitSidePxVar > 0 ? portraitSidePxVar : shellRect.width,
      portraitBottom: colRect.bottom - shellRect.bottom,
      effectiveScale: parseNum('--portrait-effective-scale'),
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

async function waitForState2Settled(page: Page): Promise<FoundationsGeometry> {
  await expect
    .poll(
      async () => {
        const g = await readFoundationsGeometry(page);
        const expected = g.columnHeight - g.portraitSide * g.effectiveScale;
        const deltaH = Math.abs(g.foundationsHeight - expected);
        const deltaB = Math.abs(g.portraitBottom - expected);
        return deltaH < 2.5 && deltaB < 2.5;
      },
      { timeout: 3000, intervals: [100, 150, 250] },
    )
    .toBe(true);
  return readFoundationsGeometry(page);
}

async function openFoundationsReveal(tile: ReturnType<Page['getByRole']>) {
  await tile.click();
  await expect(tile).toHaveClass(/is-revealed/);
  await expect(tile).toHaveClass(/is-reveal-typefit-ready/);
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
    expect(revealPx).toBeGreaterThan(0);
    expect(labelPx).toBeGreaterThan(0);
    // Reveal copy can be capped by current state2 box geometry; keep it positive and bounded.
    expect(revealPx).toBeGreaterThanOrEqual(1);
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
      /Tried\s*Writing/i,
    );
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

    expect(layout.revealPadL).toBeGreaterThanOrEqual(28);
    expect(layout.revealPadL).toBeLessThanOrEqual(34);
    expect(layout.revealPadR).toBeGreaterThanOrEqual(
      layout.revealPadL * REVEAL_RIGHT_MARGIN_RATIO_MIN -
        REVEAL_PADDING_RATIO_ASSERT_TOLERANCE_PX,
    );
    expect(layout.copyClass).toContain('tile-state-secondary');
    expect(layout.copyTextAlign).toBe('left');
    expect(layout.primaryText).toMatch(/Tried\s*Writing\?/i);
    expect(layout.secondaryText).toMatch(/Or\s*this\s*might\s*be\s*enough/i);
    expect(layout.primaryPx).toBeGreaterThan(0);
    /* line-2 / line-1 rem sizes in profile.css (0.67rem / 0.76rem) */
    expect(layout.secondaryPx / layout.primaryPx).toBeGreaterThan(0.84);
    expect(layout.secondaryPx / layout.primaryPx).toBeLessThan(0.92);
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
    expect(inner.width).toBeLessThan(outer.width - 2);
    expect(inner.height).toBeLessThan(outer.height - 2);
  });

  test('profile tile borders use portrait frame thickness with border-box sizing', async ({
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
      const tileData = tiles.map((tile) => {
        const cs = getComputedStyle(tile);
        return {
          boxSizing: cs.boxSizing,
          borderTop: Number.parseFloat(cs.borderTopWidth) || 0,
          borderRight: Number.parseFloat(cs.borderRightWidth) || 0,
          borderBottom: Number.parseFloat(cs.borderBottomWidth) || 0,
          borderLeft: Number.parseFloat(cs.borderLeftWidth) || 0,
          borderColor: cs.borderTopColor,
        };
      });
      return { frameVar, tileData };
    });

    expect(info.frameVar).toBeGreaterThan(0);
    for (const tile of info.tileData) {
      expect(tile.boxSizing).toBe('border-box');
      expect(tile.borderTop).toBeCloseTo(info.frameVar, 1);
      expect(tile.borderRight).toBeCloseTo(info.frameVar, 1);
      expect(tile.borderBottom).toBeCloseTo(info.frameVar, 1);
      expect(tile.borderLeft).toBeCloseTo(info.frameVar, 1);
      expect(tile.borderColor).toBe(RGB_INK);
    }
  });

  test('state1 hover inverts tile background and text colors', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Why' });
    await expect(tile).not.toHaveClass(/is-revealed/);

    const readColors = async () =>
      page.evaluate(() => {
        const tile = Array.from(document.querySelectorAll('a.prof-tile')).find(
          (el) =>
            (el as HTMLAnchorElement).getAttribute('aria-label') === 'Why',
        );
        if (!(tile instanceof HTMLElement))
          throw new Error('missing Why profile tile');
        const text = tile.querySelector('.page-button__text');
        const bg = tile.querySelector('.page-button__bg');
        if (!(text instanceof HTMLElement))
          throw new Error('missing .page-button__text');
        if (!(bg instanceof HTMLElement))
          throw new Error('missing .page-button__bg');

        const probe = document.createElement('span');
        probe.style.color = 'var(--color-page-bg)';
        document.body.appendChild(probe);
        const pageBgColorResolved = getComputedStyle(probe).color;
        probe.remove();

        return {
          textColor: getComputedStyle(text).color,
          bgColor: getComputedStyle(bg).backgroundColor,
          pageBgColorResolved,
        };
      });

    const before = await readColors();
    expect(before.textColor).toBe(RGB_INK);

    await tile.hover();
    await expect
      .poll(readColors, { timeout: 2000, intervals: [80, 140, 220] })
      .toMatchObject({
        textColor: before.pageBgColorResolved,
        bgColor: RGB_INK,
      });
  });

  test('state1 geometry stays locked at half height across viewport resize', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);

    const assertState1Half = async () => {
      await expect
        .poll(
          async () => {
            const g = await readFoundationsGeometry(page);
            const half = g.columnHeight / 2;
            return (
              Math.abs(g.foundationsHeight - half) < 20 &&
              Math.abs(g.portraitBottom - half) < 20
            );
          },
          { timeout: 2500, intervals: [100, 200, 350] },
        )
        .toBe(true);
    };

    await assertState1Half();
    await page.setViewportSize({ width: 980, height: 700 });
    await assertState1Half();
    await page.setViewportSize({ width: 1440, height: 980 });
    await assertState1Half();
  });

  test('state2 geometry follows A - (c * scale) and does not react to mouse position', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);
    const g1 = await waitForState2Settled(page);
    expect(g1.effectiveScale).toBeCloseTo(0.8, 2);
    const expected = g1.columnHeight - g1.portraitSide * g1.effectiveScale;
    expect(Math.abs(g1.foundationsHeight - expected)).toBeLessThan(2.5);
    expect(Math.abs(g1.portraitBottom - expected)).toBeLessThan(2.5);

    const tileBox = await mustBox(tile);
    await page.mouse.move(8, 8);
    await page.waitForTimeout(120);
    await page.mouse.move(tileBox.x + tileBox.width * 0.5, tileBox.y + 8);
    await page.waitForTimeout(120);
    await page.mouse.move(
      tileBox.x + tileBox.width * 0.8,
      tileBox.y + tileBox.height * 0.8,
    );
    await page.waitForTimeout(120);

    const g2 = await readFoundationsGeometry(page);
    expect(Math.abs(g2.foundationsHeight - g1.foundationsHeight)).toBeLessThan(
      3,
    );
    expect(Math.abs(g2.portraitBottom - g1.portraitBottom)).toBeLessThan(3);
  });

  test('state2 stays clamped during zoom-like viewport changes', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    await setRevealTimeoutMs(page, 2200);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);
    await waitForState2Settled(page);

    const assertState2Clamped = async () => {
      await expect
        .poll(
          async () => {
            const g = await readFoundationsGeometry(page);
            const expected = g.columnHeight - g.portraitSide * g.effectiveScale;
            const topDelta = await page.evaluate(() => {
              const col = document.querySelector('.profile-right-column');
              const shell = document.querySelector('.profile-photo-shell');
              if (!(col instanceof HTMLElement))
                throw new Error('missing .profile-right-column');
              if (!(shell instanceof HTMLElement))
                throw new Error('missing .profile-photo-shell');
              const colRect = col.getBoundingClientRect();
              const shellRect = shell.getBoundingClientRect();
              return shellRect.top - colRect.top;
            });
            return (
              Math.abs(g.foundationsHeight - expected) < 4 &&
              Math.abs(g.portraitBottom - expected) < 4 &&
              topDelta >= -2
            );
          },
          { timeout: 3000, intervals: [100, 180, 300] },
        )
        .toBe(true);
    };

    await assertState2Clamped();
    await page.setViewportSize({ width: 1024, height: 720 });
    await assertState2Clamped();
    await page.setViewportSize({ width: 1460, height: 920 });
    await assertState2Clamped();
    await page.setViewportSize({ width: 900, height: 980 });
    await assertState2Clamped();
  });

  test('state2 holds until timeout, then returns to state1 geometry', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    await setRevealTimeoutMs(page, 900);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);
    const state2 = await waitForState2Settled(page);
    expect(state2.foundationsHeight).toBeGreaterThan(
      state2.columnHeight * 0.5 + 2,
    );

    await expect
      .poll(
        async () => {
          const cls = (await tile.getAttribute('class')) ?? '';
          return cls.includes('is-revealed');
        },
        { timeout: 2500, intervals: [100, 200, 350] },
      )
      .toBe(false);

    await expect
      .poll(
        async () => {
          const state1 = await readFoundationsGeometry(page);
          const half = state1.columnHeight / 2;
          return (
            Math.abs(state1.foundationsHeight - half) < 20 &&
            Math.abs(state1.portraitBottom - half) < 20
          );
        },
        { timeout: 3000, intervals: [100, 180, 300] },
      )
      .toBe(true);
  });
});
