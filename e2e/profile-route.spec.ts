import { test, expect, type Page } from '@playwright/test';
import { gotoProfileWhenReady, mustBox } from './helpers';

type FoundationsGeometry = {
  columnHeight: number;
  foundationsHeight: number;
  portraitSide: number;
  portraitBottom: number;
  effectiveScale: number;
};

async function readFoundationsGeometry(page: Page): Promise<FoundationsGeometry> {
  return page.evaluate(() => {
    const col = document.querySelector('.profile-right-column');
    const tile = document.querySelector('.profile-tile-button--foundations');
    const box = document.querySelector('.profile-photo-box');
    if (!(col instanceof HTMLElement)) throw new Error('missing .profile-right-column');
    if (!(tile instanceof HTMLElement))
      throw new Error('missing .profile-tile-button--foundations');
    if (!(box instanceof HTMLElement)) throw new Error('missing .profile-photo-box');

    const cs = getComputedStyle(col);
    const parseNum = (name: string): number => {
      const raw = cs.getPropertyValue(name).trim();
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    };
    const colRect = col.getBoundingClientRect();
    const tileRect = tile.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();

    return {
      columnHeight: colRect.height,
      foundationsHeight: tileRect.height,
      portraitSide: boxRect.width,
      portraitBottom: colRect.bottom - boxRect.bottom,
      effectiveScale: parseNum('--portrait-effective-scale'),
    };
  });
}

async function setRevealTimeoutMs(page: Page, ms: number): Promise<void> {
  await page.evaluate((timeout) => {
    const tile = document.querySelector(
      '.profile-tile-button--foundations',
    ) as HTMLElement | null;
    if (!tile) throw new Error('missing .profile-tile-button--foundations');
    tile.style.setProperty('--profile-reveal-timeout-ms', `${timeout}`);
  }, ms);
}

async function waitForState2Settled(page: Page): Promise<FoundationsGeometry> {
  await expect
    .poll(async () => {
      const g = await readFoundationsGeometry(page);
      const expected = g.columnHeight - g.portraitSide * g.effectiveScale;
      const deltaH = Math.abs(g.foundationsHeight - expected);
      const deltaB = Math.abs(g.portraitBottom - expected);
      return deltaH < 2.5 && deltaB < 2.5;
    }, { timeout: 3000, intervals: [100, 150, 250] })
    .toBe(true);
  return readFoundationsGeometry(page);
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
    const raw = await page
      .locator('.profile-tile-button--foundations .profile-tile-button__reveal')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--profile-reveal-font-size'),
      );
    expect(raw.trim()).toMatch(/px$/);
    expect(parseFloat(raw)).toBeGreaterThan(0);
  });

  test('Foundations tile targets /foundations and uses foundations modifier', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await expect(tile).toHaveAttribute('href', '/foundations');
    await expect(tile).toHaveClass(/profile-tile-button--foundations/);
  });

  test('first click opens reveal and stays on /profile', async ({ page }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);
    await expect(page).toHaveURL(/\/profile\/?$/);
    await expect(tile.locator('.profile-tile-button__reveal')).toContainText(
      /What shaped me/i,
    );
  });

  test('second click while revealed navigates to /foundations', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);
    await tile.click();
    await expect(page).toHaveURL(/\/foundations\/?$/);
  });

  test('portrait lives in photo frame with inset photo box', async ({ page }) => {
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
    await page.mouse.move(tileBox.x + tileBox.width * 0.8, tileBox.y + tileBox.height * 0.8);
    await page.waitForTimeout(120);

    const g2 = await readFoundationsGeometry(page);
    expect(Math.abs(g2.foundationsHeight - g1.foundationsHeight)).toBeLessThan(3);
    expect(Math.abs(g2.portraitBottom - g1.portraitBottom)).toBeLessThan(3);
  });

  test('state2 holds until timeout, then returns to state1 geometry', async ({ page }) => {
    await gotoProfileWhenReady(page);
    await setRevealTimeoutMs(page, 900);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);
    const state2 = await waitForState2Settled(page);
    expect(state2.foundationsHeight).toBeGreaterThan(state2.columnHeight * 0.5 + 2);

    await expect
      .poll(async () => {
        const cls = (await tile.getAttribute('class')) ?? '';
        return cls.includes('is-revealed');
      }, { timeout: 2500, intervals: [100, 200, 350] })
      .toBe(false);

    const state1 = await readFoundationsGeometry(page);
    const half = state1.columnHeight / 2;
    expect(Math.abs(state1.foundationsHeight - half)).toBeLessThan(20);
    expect(Math.abs(state1.portraitBottom - half)).toBeLessThan(20);
  });

  test('state2 works without hover capability (touch-like)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Touch-capability override is Chromium-only here');

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', {
      enabled: true,
      maxTouchPoints: 1,
    });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', {
      enabled: true,
      configuration: 'mobile',
    });

    await gotoProfileWhenReady(page);
    await setRevealTimeoutMs(page, 900);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.dispatchEvent('click');
    await expect(tile).toHaveClass(/is-revealed/);
    const state2 = await waitForState2Settled(page);
    const expected = state2.columnHeight - state2.portraitSide * state2.effectiveScale;
    expect(Math.abs(state2.foundationsHeight - expected)).toBeLessThan(3);
    expect(Math.abs(state2.portraitBottom - expected)).toBeLessThan(3);

    await expect
      .poll(async () => {
        const cls = (await tile.getAttribute('class')) ?? '';
        return cls.includes('is-revealed');
      }, { timeout: 2500, intervals: [100, 200, 350] })
      .toBe(false);
  });
});
