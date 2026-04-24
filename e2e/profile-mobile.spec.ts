import { test, expect, type Page } from '@playwright/test';
import { RGB_INK } from '../src/constants/colors';
import {
  REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX,
  REVEAL_RIGHT_MARGIN_RATIO_MIN,
  REVEAL_RIGHT_RENDER_PAD_PX,
} from '../src/utils/profile-reveal-constants';
import {
  expectFoundationsRevealCopyPainted,
  gotoProfileWhenReady,
} from './helpers';

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
    await expect(tile).toHaveClass(/is-reveal-typefit-ready/);
    await expectFoundationsRevealCopyPainted(tile);

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
    await expect(tile).toHaveClass(/is-reveal-typefit-ready/);
    await expectFoundationsRevealCopyPainted(tile);

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
            if (!(reveal instanceof HTMLElement))
              throw new Error('missing .prof-tile__reveal');
            if (!(stanza instanceof HTMLElement))
              throw new Error('missing .tile-state-secondary');
            if (!(line1 instanceof HTMLElement))
              throw new Error('missing .line-1');
            const stanzaRect = stanza.getBoundingClientRect();
            const lineRect = line1.getBoundingClientRect();
            return {
              hFits: stanza.scrollHeight <= stanza.clientHeight + 1,
              rightGap: stanzaRect.right - lineRect.right,
              leftMargin: lineRect.left - reveal.getBoundingClientRect().left,
              rightMargin:
                reveal.getBoundingClientRect().right - lineRect.right,
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
            if (!(reveal instanceof HTMLElement))
              throw new Error('missing .prof-tile__reveal');
            if (!(stanza instanceof HTMLElement))
              throw new Error('missing .tile-state-secondary');
            if (!(line1 instanceof HTMLElement))
              throw new Error('missing .line-1');
            const stanzaRect = stanza.getBoundingClientRect();
            const lineRect = line1.getBoundingClientRect();
            const revealRect = reveal.getBoundingClientRect();
            return {
              rightGap: stanzaRect.right - lineRect.right,
              leftMargin: lineRect.left - revealRect.left,
              rightMargin: revealRect.right - lineRect.right,
            };
          }),
        { timeout: 2500, intervals: [100, 180, 300] },
      )
      .toMatchObject({
        rightGap: expect.any(Number),
        leftMargin: expect.any(Number),
        rightMargin: expect.any(Number),
      });

    const marginCheck = await page.evaluate(() => {
      const reveal = document.querySelector(
        '.prof-tile--foundations .prof-tile__reveal',
      );
      const stanza = reveal?.querySelector('.tile-state-secondary');
      const line1 = reveal?.querySelector('.tile-state-secondary .line-1');
      if (!(reveal instanceof HTMLElement))
        throw new Error('missing .prof-tile__reveal');
      if (!(stanza instanceof HTMLElement))
        throw new Error('missing .tile-state-secondary');
      if (!(line1 instanceof HTMLElement)) throw new Error('missing .line-1');
      const stanzaRect = stanza.getBoundingClientRect();
      const lineRect = line1.getBoundingClientRect();
      const revealRect = reveal.getBoundingClientRect();
      return {
        rightGap: stanzaRect.right - lineRect.right,
        leftMargin: lineRect.left - revealRect.left,
        rightMargin: revealRect.right - lineRect.right,
      };
    });
    expect(marginCheck.rightGap).toBeGreaterThanOrEqual(0);
    expect(
      marginCheck.rightMargin + REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX,
    ).toBeGreaterThanOrEqual(
      marginCheck.leftMargin * REVEAL_RIGHT_MARGIN_RATIO_MIN +
        REVEAL_RIGHT_RENDER_PAD_PX,
    );

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

  test('history back from /foundations restores Foundations tile to state1', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    await setRevealTimeoutMs(page, 5000);

    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);

    await tile.click();
    await expect(page).toHaveURL(/\/foundations\/?$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/profile\/?$/);

    await expect
      .poll(
        async () => {
          const cls = (await tile.getAttribute('class')) ?? '';
          return {
            revealed: cls.includes('is-revealed'),
            fading: cls.includes('is-reveal-fading-out'),
            opening: cls.includes('is-reveal-opening'),
          };
        },
        { timeout: 2000, intervals: [100, 200, 350] },
      )
      .toEqual({ revealed: false, fading: false, opening: false });
  });
});
