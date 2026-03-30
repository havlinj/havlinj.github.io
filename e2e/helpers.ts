import { expect, type Locator, type Page } from '@playwright/test';

export async function gotoProfileWhenReady(page: Page): Promise<void> {
  await page.goto('/profile');
  await page
    .locator('.profile-section:not(.profile-section--loading)')
    .waitFor({ state: 'visible', timeout: 10000 });
}

export async function expectNavLinkActive(
  page: Page,
  linkName: string,
): Promise<void> {
  await expect(page.getByRole('link', { name: linkName })).toHaveClass(
    /site-nav__link--active/,
  );
}

export async function mustBox(locator: Locator): Promise<NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>> {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  return box!;
}
