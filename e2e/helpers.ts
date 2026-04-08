import { expect, type Locator, type Page } from '@playwright/test';

export async function gotoProfileWhenReady(page: Page): Promise<void> {
  await page.goto('/profile');
  await page
    .locator('.profile-section:not(.profile-section--loading)')
    .waitFor({ state: 'visible', timeout: 10000 });
}

/** Why page: inline script removes pending class after spacer/GIF metrics settle. */
export async function gotoWhyWhenReady(page: Page): Promise<void> {
  await page.goto('/why');
  await page
    .locator('.why-page .why-content.why-content--ready')
    .waitFor({ state: 'visible', timeout: 10000 });
}

/** Two rAF ticks so layout / why-box-scroll `update()` after scrollTop settle. */
export async function waitTwoFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

export async function expectNavLinkActive(
  page: Page,
  linkName: string,
): Promise<void> {
  await expect(page.getByRole('link', { name: linkName })).toHaveClass(
    /site-nav__link--active/,
  );
}

export async function mustBox(
  locator: Locator,
): Promise<NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>> {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  return box!;
}

export async function fillContactFormWithValidData(page: Page): Promise<void> {
  await page.getByLabel('Name').fill('Jan Test');
  await page.getByLabel('Email').fill('jan@example.com');
  await page.getByLabel('Message').fill('This is a test message long enough.');
}

export async function installTurnstileResetCounter(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __turnstileResetCount: number }).__turnstileResetCount =
      0;
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
