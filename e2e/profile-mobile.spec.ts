import { test, expect, type Page } from '@playwright/test';
import { RGB_INK } from '../src/constants/colors';
import { gotoProfileWhenReady } from './helpers';

async function setRevealTimeoutMs(page: Page, ms: number): Promise<void> {
  await page.evaluate((timeout) => {
    const tile = document.querySelector(
      '.prof-tile--foundations',
    ) as HTMLElement | null;
    if (!tile) throw new Error('missing .prof-tile--foundations');
    tile.style.setProperty('--profile-reveal-timeout-ms', `${timeout}`);
  }, ms);
}

test.describe('/profile mobile regressions @serial', () => {
  test('Foundations reveal visual snapshot on mobile', async ({ page }) => {
    await gotoProfileWhenReady(page);
    await setRevealTimeoutMs(page, 2500);

    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);

    const reveal = page.locator('.prof-tile--foundations .prof-tile__reveal');
    await expect(reveal).toBeVisible();
    await expect(reveal).toHaveScreenshot('foundations-reveal-mobile.png');
  });

  test('Foundations reveal text fits inside state2 box', async ({ page }) => {
    await gotoProfileWhenReady(page);
    await setRevealTimeoutMs(page, 2500);

    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const reveal = document.querySelector(
              '.prof-tile--foundations .prof-tile__reveal',
            );
            const stanza = reveal?.querySelector('.tile-state-secondary');
            const line1 = reveal?.querySelector(
              '.tile-state-secondary .line-1',
            );
            if (!(stanza instanceof HTMLElement))
              throw new Error('missing .tile-state-secondary');
            if (!(line1 instanceof HTMLElement))
              throw new Error('missing .line-1');
            const stanzaRect = stanza.getBoundingClientRect();
            const lineRect = line1.getBoundingClientRect();
            return {
              hFits: stanza.scrollHeight <= stanza.clientHeight + 1,
              rightGap: stanzaRect.right - lineRect.right,
            };
          }),
        { timeout: 2500, intervals: [100, 180, 300] },
      )
      .toMatchObject({ hFits: true });

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const reveal = document.querySelector(
              '.prof-tile--foundations .prof-tile__reveal',
            );
            const stanza = reveal?.querySelector('.tile-state-secondary');
            const line1 = reveal?.querySelector(
              '.tile-state-secondary .line-1',
            );
            if (!(stanza instanceof HTMLElement))
              throw new Error('missing .tile-state-secondary');
            if (!(line1 instanceof HTMLElement))
              throw new Error('missing .line-1');
            const stanzaRect = stanza.getBoundingClientRect();
            const lineRect = line1.getBoundingClientRect();
            return stanzaRect.right - lineRect.right;
          }),
        { timeout: 2500, intervals: [100, 180, 300] },
      )
      .toBeGreaterThanOrEqual(0);

    // Visual guardrail for real clipping regressions.
    await expect(
      page.locator('.prof-tile--foundations .prof-tile__reveal'),
    ).toHaveScreenshot('foundations-reveal-mobile.png');
  });

  test('Foundations returns to state1 colors after state2 timeout', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    await setRevealTimeoutMs(page, 900);

    const tile = page.getByRole('link', { name: 'Foundations' });
    const readState1Colors = async () =>
      page.evaluate(() => {
        const tile = document.querySelector(
          '.prof-tile--foundations',
        ) as HTMLElement | null;
        if (!tile) throw new Error('missing .prof-tile--foundations');
        const text = tile.querySelector('.page-button__text');
        const bg = tile.querySelector('.page-button__bg');
        if (!(text instanceof HTMLElement))
          throw new Error('missing .page-button__text');
        if (!(bg instanceof HTMLElement))
          throw new Error('missing .page-button__bg');
        return {
          textColor: getComputedStyle(text).color,
          bgColor: getComputedStyle(bg).backgroundColor,
        };
      });

    const before = await readState1Colors();
    expect(before.textColor).toBe(RGB_INK);

    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);

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
      .poll(readState1Colors, {
        timeout: 2500,
        intervals: [100, 180, 300],
      })
      .toEqual(before);
  });
});
