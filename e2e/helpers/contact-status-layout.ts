import { expect, type Page } from '@playwright/test';
import {
  CONTACT_ERROR_CODES,
  CONTACT_ERROR_MESSAGES,
  CONTACT_STATUS_LAYOUT,
  CONTACT_STATUS_MESSAGES,
  type ContactErrorCode,
  type ContactStatusCode,
} from '../../src/lib/contact-status';

export { CONTACT_ERROR_CODES, CONTACT_ERROR_MESSAGES };

export async function showContactStatus(
  page: Page,
  code: ContactStatusCode,
): Promise<void> {
  const message = CONTACT_STATUS_MESSAGES[code];
  const isError =
    (CONTACT_ERROR_CODES as readonly string[]).includes(code) ||
    code === 'network_error' ||
    code === 'unknown';

  await page.evaluate(
    ({ message, code, isError }) => {
      const status = document.querySelector('#status');
      if (!(status instanceof HTMLElement)) return;
      status.textContent = message;
      status.dataset.statusCode = code;
      status.classList.remove(
        'contact-status--error',
        'contact-status--success',
        'contact-status--pending',
      );
      if (isError) status.classList.add('contact-status--error');
    },
    { message, code, isError },
  );
}

export async function expectStatusFitsSendSlot(page: Page): Promise<void> {
  const metrics = await page
    .locator('#contact-form .contact-form__actions')
    .evaluate((actions) => {
      const send = actions.querySelector('button[type="submit"]');
      const status = actions.querySelector('#status');
      if (!send || !status) return null;

      const statusStyles = getComputedStyle(status);
      const maxHeightPx = parseFloat(statusStyles.maxHeight);
      const statusRect = status.getBoundingClientRect();

      return {
        maxHeightPx,
        statusHeight: statusRect.height,
        scrollHeight: status.scrollHeight,
        clientHeight: status.clientHeight,
      };
    });

  expect(metrics).not.toBeNull();
  expect(metrics!.maxHeightPx).toBeGreaterThan(0);
  expect(metrics!.statusHeight).toBeLessThanOrEqual(metrics!.maxHeightPx + 1);
  expect(metrics!.scrollHeight).toBeLessThanOrEqual(metrics!.clientHeight + 2);
}

export function allContactErrorCodes(): readonly ContactErrorCode[] {
  return CONTACT_ERROR_CODES;
}

const CONTACT_STATUS_MEDIA_VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 720 },
  { label: 'mobile', width: 390, height: 844 },
] as const;

export { CONTACT_STATUS_MEDIA_VIEWPORTS };

function remToPx(rem: number, rootFontSizePx: number): number {
  return rem * rootFontSizePx;
}

/** Browsers may return `0.15rem` or `.15rem` from getPropertyValue. */
function parseCssRem(value: string | undefined): number {
  if (!value) return NaN;
  const match = value.trim().match(/^(-?\d*\.?\d+)rem$/);
  return match ? parseFloat(match[1]) : NaN;
}

/** Asserts #status uses CONTACT_STATUS_LAYOUT padding and line-height. */
export async function expectContactStatusTypography(page: Page): Promise<void> {
  const styles = await page.locator('#status').evaluate((el) => {
    const statusStyles = getComputedStyle(el);
    const rootFontSizePx = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const actions = el.closest('.contact-form__actions');
    const actionStyles = actions ? getComputedStyle(actions) : null;

    return {
      rootFontSizePx,
      fontSizePx: parseFloat(statusStyles.fontSize),
      lineHeightPx: parseFloat(statusStyles.lineHeight),
      paddingTopPx: parseFloat(statusStyles.paddingTop),
      paddingBottomPx: parseFloat(statusStyles.paddingBottom),
      paddingLeftPx: parseFloat(statusStyles.paddingLeft),
      paddingRightPx: parseFloat(statusStyles.paddingRight),
      padBlockVar: actionStyles
        ?.getPropertyValue('--contact-status-pad-block')
        .trim(),
      padInlineVar: actionStyles
        ?.getPropertyValue('--contact-status-pad-inline')
        .trim(),
    };
  });

  const { rootFontSizePx } = styles;
  const layout = CONTACT_STATUS_LAYOUT;

  expect(parseCssRem(styles.padBlockVar)).toBe(layout.statusPadBlockRem);
  expect(parseCssRem(styles.padInlineVar)).toBe(layout.statusPadInlineRem);

  expect(styles.fontSizePx).toBeCloseTo(
    remToPx(layout.statusFontSizeRem, rootFontSizePx),
    1,
  );
  expect(styles.lineHeightPx).toBeCloseTo(
    styles.fontSizePx * layout.statusLineHeight,
    1,
  );
  expect(styles.paddingTopPx).toBeCloseTo(
    remToPx(layout.statusPadBlockRem, rootFontSizePx),
    1,
  );
  expect(styles.paddingBottomPx).toBeCloseTo(
    remToPx(layout.statusPadBlockRem, rootFontSizePx),
    1,
  );
  expect(styles.paddingLeftPx).toBeCloseTo(
    remToPx(layout.statusPadInlineRem, rootFontSizePx),
    1,
  );
  expect(styles.paddingRightPx).toBeCloseTo(
    remToPx(layout.statusPadInlineRem, rootFontSizePx),
    1,
  );
}

export async function expectContactStatusTypographyBothMedia(
  page: Page,
): Promise<void> {
  for (const viewport of CONTACT_STATUS_MEDIA_VIEWPORTS) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto('/contact/form');
    await showContactStatus(page, 'message_length');
    await expectContactStatusTypography(page);
  }
}
