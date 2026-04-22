import { expect, type Page } from '@playwright/test';

/**
 * True when the page is already on /profile (with optional trailing slash / query / hash).
 * Used to skip a redundant `goto('/profile')`: Chromium can restore the same URL from
 * BFCache without re-running inline/module boot, leaving `.profile-section--loading` stuck.
 */
export function pathnameIsProfile(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/$/, '') || '/';
    return path === '/profile';
  } catch {
    return false;
  }
}

export async function gotoProfileWhenReady(page: Page): Promise<void> {
  if (!pathnameIsProfile(page.url())) {
    await page.goto('/profile');
  }
  await page
    .locator('.profile-section:not(.profile-section--loading)')
    .waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Why page: wait until why-box-scroll layout has applied (ready class or pad var).
 * Use after `reload()` on /why — avoids a redundant full `goto`.
 */
export async function awaitWhyLayoutReady(page: Page): Promise<void> {
  await page.locator('.why-page .why-scroll').first().waitFor({
    state: 'attached',
    timeout: 10000,
  });
  await page.locator('.why-page .why-scroll p').first().waitFor({
    state: 'attached',
    timeout: 10000,
  });
  try {
    await page.waitForFunction(
      () => {
        const content = document.querySelector('.why-page .why-content');
        const firstP = document.querySelector('.why-page .why-scroll p');
        if (
          !(content instanceof HTMLElement) ||
          !(firstP instanceof HTMLElement)
        ) {
          return false;
        }
        const isReadyClass = content.classList.contains('why-content--ready');
        const padTop = getComputedStyle(content)
          .getPropertyValue('--why-scroll-pad-top')
          .trim();
        const hasLayoutVar = /^\d+(\.\d+)?px$/.test(padTop);
        return isReadyClass || hasLayoutVar;
      },
      {
        timeout: 10000,
      },
    );
  } catch {
    // Keep tests running; individual assertions should report concrete failures.
  }
}

/** Navigate to /why and wait for layout script (see `awaitWhyLayoutReady`). */
export async function gotoWhyWhenReady(page: Page): Promise<void> {
  await page.goto('/why', { waitUntil: 'domcontentloaded' });
  await awaitWhyLayoutReady(page);
}

export async function expectNavLinkActive(
  page: Page,
  linkName: string,
): Promise<void> {
  await expect(page.getByRole('link', { name: linkName })).toHaveClass(
    /site-nav__link--active/,
  );
}
