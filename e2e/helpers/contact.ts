import type { Page } from '@playwright/test';

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
