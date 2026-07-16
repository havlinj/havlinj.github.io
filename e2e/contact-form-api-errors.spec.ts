import { expect, test } from '@playwright/test';
import {
  CONTACT_API_ERROR_RESETS_TURNSTILE,
  CONTACT_ERROR_CODES,
  expectContactFormShowsApiError,
  fillContactFormWithValidData,
  gotoContactForm,
  installTurnstileResetCounter,
  mockContactApiError,
  readTurnstileResetCount,
  submitContactForm,
  type ContactErrorCode,
} from './helpers/contact';

function shouldResetTurnstile(code: ContactErrorCode): boolean {
  return (CONTACT_API_ERROR_RESETS_TURNSTILE as readonly string[]).includes(
    code,
  );
}

for (const code of CONTACT_ERROR_CODES) {
  test(`API error "${code}" maps to status message and data-status-code`, async ({
    page,
  }) => {
    await mockContactApiError(page, {
      code,
      resetTurnstile: shouldResetTurnstile(code),
    });
    await gotoContactForm(page);
    await installTurnstileResetCounter(page);
    await fillContactFormWithValidData(page);
    await submitContactForm(page);
    await expectContactFormShowsApiError(page, code);

    const resets = await readTurnstileResetCount(page);
    if (shouldResetTurnstile(code)) {
      expect(resets, `${code} should reset Turnstile`).toBe(1);
    } else {
      expect(resets, `${code} should not reset Turnstile`).toBe(0);
    }
  });
}

test('legacy API error string without code still resolves status', async ({
  page,
}) => {
  const code: ContactErrorCode = 'invalid_email';
  await mockContactApiError(page, { code, legacyErrorOnly: true });
  await gotoContactForm(page);
  await fillContactFormWithValidData(page);
  await submitContactForm(page);
  await expectContactFormShowsApiError(page, code);
});

test('unknown API error shows generic message', async ({ page }) => {
  await page.route('**/api/contact', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'Something unexpected.' }),
    });
  });

  await gotoContactForm(page);
  await fillContactFormWithValidData(page);
  await submitContactForm(page);

  const status = page.locator('#status');
  await status.waitFor({ state: 'visible' });
  await expect(status).toHaveText('Something went wrong.');
  await expect(status).toHaveAttribute('data-status-code', 'unknown');
  await expect(status).toHaveClass(/contact-status--error/);
});
