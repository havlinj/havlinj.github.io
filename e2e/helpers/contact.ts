import { expect, type Page } from '@playwright/test';
import {
  CONTACT_ERROR_CODES,
  CONTACT_ERROR_MESSAGES,
  type ContactErrorCode,
} from '../../src/lib/contact-status';

/** Matches contact_worker responses that set `resetTurnstile: true`. */
export const CONTACT_API_ERROR_RESETS_TURNSTILE: readonly ContactErrorCode[] = [
  'turnstile_missing',
  'turnstile_unavailable',
  'turnstile_failed',
];

/** Hold `/api/contact` until `release()` — for asserting transient UI (e.g. sending). */
export async function mockContactApiDelayedSuccess(
  page: Page,
): Promise<{ release: () => void }> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route('**/api/contact', async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  return { release };
}

export async function mockContactApiError(
  page: Page,
  opts: {
    code: ContactErrorCode;
    status?: number;
    resetTurnstile?: boolean;
    /** Omit `code` in JSON (legacy worker-style body with `error` only). */
    legacyErrorOnly?: boolean;
  },
): Promise<void> {
  const message = CONTACT_ERROR_MESSAGES[opts.code];
  const body = opts.legacyErrorOnly
    ? { ok: false, error: message }
    : {
        ok: false,
        code: opts.code,
        error: message,
        ...(opts.resetTurnstile ? { resetTurnstile: true } : {}),
      };

  await page.route('**/api/contact', async (route) => {
    await route.fulfill({
      status: opts.status ?? 400,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

export async function expectContactFormShowsApiError(
  page: Page,
  code: ContactErrorCode,
): Promise<void> {
  const status = page.locator('#status');
  await expect(status).toHaveText(CONTACT_ERROR_MESSAGES[code]);
  await expect(status).toHaveAttribute('data-status-code', code);
  await expect(status).toHaveClass(/contact-status--error/);
}

export async function submitContactForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Send' }).click();
}

export { CONTACT_ERROR_CODES, CONTACT_ERROR_MESSAGES, type ContactErrorCode };

/**
 * Open the contact form without waiting on Cloudflare Turnstile.
 * Default `load` hangs when challenges.cloudflare.com is slow/unreachable.
 */
export async function gotoContactForm(page: Page): Promise<void> {
  await page.route('**/challenges.cloudflare.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'window.turnstile={render(){},reset(){},remove(){},getResponse(){return"test";}};',
    });
  });
  await page.goto('/contact/form', { waitUntil: 'domcontentloaded' });
}

export async function fillContactFormWithValidData(page: Page): Promise<void> {
  await page.getByLabel('Name').fill('Jan Test');
  await page.getByLabel('Email').fill('jan@example.com');
  await page.getByLabel('Message').fill('This is a test message long enough.');
}

export async function installTurnstileResetCounter(page: Page): Promise<void> {
  await page.evaluate(() => {
    (
      window as unknown as { __turnstileResetCount: number }
    ).__turnstileResetCount = 0;
    (window as unknown as { turnstile: { reset: () => void } }).turnstile = {
      reset: () => {
        (
          window as unknown as { __turnstileResetCount: number }
        ).__turnstileResetCount += 1;
      },
    };
  });
}

export async function readTurnstileResetCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (window as unknown as { __turnstileResetCount: number })
        .__turnstileResetCount,
  );
}
