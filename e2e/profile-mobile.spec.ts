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

test.describe('/profile mobile regressions', () => {
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
        if (!(bg instanceof HTMLElement)) throw new Error('missing .page-button__bg');
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
