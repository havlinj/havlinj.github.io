/**
 * The loaded Bayer file follows the painted box (zoom included), not `sizes` × viewport.
 *
 *   PW_SERVER_MODE=preview npx playwright test e2e/responsive-panel-bg-matrix.spec.ts --project=desktop-chromium
 */
import { expect, test, type Page } from '@playwright/test';
import { HERO_BG_FILE_STEM } from '../src/constants/hero-layout';
import { PROFILE_PANEL_BG_FILE_STEM } from '../src/constants/profile-layout';
import { expectDichromTierMatchesPaint } from './helpers/responsive-panel-bg-matrix';

const VIEWPORTS = [
  { width: 390, height: 844, deviceScaleFactor: 3 },
  { width: 1280, height: 800, deviceScaleFactor: 1 },
  { width: 1440, height: 900, deviceScaleFactor: 2 },
] as const;

type SyncCase = {
  suiteTitle: string;
  path: string;
  imgSelector: string;
  waitForReady?: (page: Page) => Promise<void>;
};

const CASES: SyncCase[] = [
  {
    suiteTitle: 'Home hero',
    path: '/',
    imgSelector: '.hero-bg__image',
    waitForReady: async (page) => {
      await expect(page.locator('section.hero')).toBeVisible();
    },
  },
  {
    suiteTitle: 'Writing panel',
    path: '/writing',
    imgSelector: '.writing-page .page-buttons-panel__media img',
    waitForReady: async (page) => {
      await expect(
        page.locator('.writing-groups.writing-groups--visible'),
      ).toBeVisible({ timeout: 10_000 });
    },
  },
  {
    suiteTitle: 'Contact panel',
    path: '/contact',
    imgSelector: '.contact-page .page-buttons-panel__media img',
    waitForReady: async (page) => {
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const el = document.querySelector(
                '.contact-page .contact-page__fit-content',
              ) as HTMLElement | null;
              if (!el) return false;
              const cs = getComputedStyle(el);
              return (
                el.classList.contains('contact-page__fit-content--visible') &&
                cs.opacity === '1'
              );
            }),
          { timeout: 10_000 },
        )
        .toBe(true);
    },
  },
  {
    suiteTitle: 'Profile panel',
    path: '/profile',
    imgSelector: '.profile-section__media img',
    waitForReady: async (page) => {
      await expect(
        page.locator('.profile-section:not(.profile-section--loading)'),
      ).toBeVisible({ timeout: 15_000 });
    },
  },
  {
    suiteTitle: 'Profile Why this tile',
    path: '/profile',
    imgSelector: '.prof-tile--why .profile-media-surface__paint img',
    waitForReady: async (page) => {
      await expect(
        page.locator('.profile-section:not(.profile-section--loading)'),
      ).toBeVisible({ timeout: 15_000 });
    },
  },
  {
    suiteTitle: 'Profile Foundations tile',
    path: '/profile',
    imgSelector: '.prof-tile--foundations .profile-media-surface__paint img',
    waitForReady: async (page) => {
      await expect(
        page.locator('.profile-section:not(.profile-section--loading)'),
      ).toBeVisible({ timeout: 15_000 });
    },
  },
  {
    suiteTitle: 'Profile portrait',
    path: '/profile',
    imgSelector: '.profile-photo-frame img',
    waitForReady: async (page) => {
      await expect(
        page.locator('.profile-section:not(.profile-section--loading)'),
      ).toBeVisible({ timeout: 15_000 });
    },
  },
];

function tierSuffix(url: string): string {
  const match = url.match(/_(\d+)\.png/);
  return match?.[1] ?? '';
}

for (const syncCase of CASES) {
  test.describe(syncCase.suiteTitle, () => {
    for (const viewport of VIEWPORTS) {
      test(`matches painted size @ ${viewport.width}×${viewport.height} dpr=${viewport.deviceScaleFactor}`, async ({
        browser,
        baseURL,
      }) => {
        const context = await browser.newContext({
          baseURL,
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: viewport.deviceScaleFactor,
        });
        const page = await context.newPage();
        try {
          await page.goto(syncCase.path, { waitUntil: 'domcontentloaded' });
          await syncCase.waitForReady?.(page);
          await expectDichromTierMatchesPaint(page, syncCase.imgSelector);
          const currentSrc = await page
            .locator(syncCase.imgSelector)
            .first()
            .evaluate((el) => (el as HTMLImageElement).currentSrc);
          if (syncCase.path === '/') {
            expect(currentSrc).toContain(HERO_BG_FILE_STEM);
          }
          if (syncCase.imgSelector === '.profile-section__media img') {
            expect(currentSrc).toContain(PROFILE_PANEL_BG_FILE_STEM);
          }
        } finally {
          await context.close();
        }
      });
    }
  });
}

test('writing reloads a different Bayer tier when the painted box changes', async ({
  page,
}) => {
  await page.goto('/writing', { waitUntil: 'domcontentloaded' });
  await expect(
    page.locator('.writing-groups.writing-groups--visible'),
  ).toBeVisible({
    timeout: 10_000,
  });
  const img = page
    .locator('.writing-page .page-buttons-panel__media img')
    .first();
  await expectDichromTierMatchesPaint(
    page,
    '.writing-page .page-buttons-panel__media img',
  );
  const before = tierSuffix(
    await img.evaluate((el) => (el as HTMLImageElement).currentSrc),
  );
  expect(before).not.toBe('');

  await img.evaluate((el) => {
    const image = el as HTMLImageElement;
    image.style.width = '2400px';
    image.style.height = '2400px';
    image.style.maxWidth = 'none';
  });

  await expect
    .poll(
      async () =>
        tierSuffix(
          await img.evaluate((el) => (el as HTMLImageElement).currentSrc),
        ),
      {
        timeout: 15_000,
      },
    )
    .not.toBe(before);

  await img.evaluate((el) => {
    const image = el as HTMLImageElement;
    image.style.width = '';
    image.style.height = '';
    image.style.maxWidth = '';
  });

  await expect
    .poll(
      async () =>
        tierSuffix(
          await img.evaluate((el) => (el as HTMLImageElement).currentSrc),
        ),
      {
        timeout: 15_000,
      },
    )
    .toBe(before);
});
