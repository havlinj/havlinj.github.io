import { expect, type Page } from '@playwright/test';
import { waitTwoFrames } from './raf';

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
  const section = page.locator(
    '.profile-section:not(.profile-section--loading)',
  );
  await section.waitFor({ state: 'visible', timeout: 15000 });
  /* Wait for the shared page reveal fade (Hero / Writing / Contact / Profile). */
  await page.waitForFunction(() => {
    const el = document.querySelector('.profile-section');
    if (!(el instanceof HTMLElement)) return false;
    if (el.classList.contains('profile-section--loading')) return false;
    return Number.parseFloat(getComputedStyle(el).opacity) >= 0.99;
  });
}

/**
 * Why this page: wait until why-box-scroll layout has applied (ready class or pad var).
 * Use after `reload()` on /why-this — avoids a redundant full `goto`.
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
        if (!isReadyClass && !hasLayoutVar) return false;

        const box = document.querySelector('.why-page .why-box');
        const cta = document.querySelector('.why-page .why-scroll-cta');
        if (box instanceof HTMLElement && cta) {
          const ctaTop = getComputedStyle(box)
            .getPropertyValue('--why-cta-top')
            .trim();
          if (!/^\d+(\.\d+)?px$/.test(ctaTop)) return false;
        }
        return true;
      },
      {
        timeout: 10000,
      },
    );
  } catch {
    // Keep tests running; individual assertions should report concrete failures.
  }
}

/** Navigate to /why-this and wait for layout script (see `awaitWhyLayoutReady`). */
export async function gotoWhyWhenReady(page: Page): Promise<void> {
  await page.goto('/why-this', { waitUntil: 'domcontentloaded' });
  await awaitWhyLayoutReady(page);
  await waitTwoFrames(page);
}

export async function expectNavLinkActive(
  page: Page,
  linkName: string,
): Promise<void> {
  await expect(page.getByRole('link', { name: linkName })).toHaveClass(
    /site-nav__link--active/,
  );
}
