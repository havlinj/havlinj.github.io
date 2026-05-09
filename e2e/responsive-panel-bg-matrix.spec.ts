/**
 * Matrix: each case asserts which responsive PNG tier Chromium loads for a fixed viewport×DPR.
 *
 * Regenerate expectations after changing `<picture>` breakpoints, `sizes`, or intrinsic widths:
 *   PW_SERVER_MODE=preview npx playwright test e2e/responsive-panel-bg-matrix.spec.ts --project=desktop-chromium
 *
 * Four “main” surfaces (home hero + profile/contact panels) share this helper; ship markup first,
 * then flip `skipSuiteReason` off and swap `urlMatcher` stems to match each page’s filenames.
 */
import { expect } from '@playwright/test';
import {
  declareResponsivePanelBgMatrix,
  type ResponsivePanelBgCase,
} from './helpers/responsive-panel-bg-matrix';

const WRITING_BG_STEM = 'weichao-deng-k0JQkPtfN3s-unsplash_dichrom';
const CONTACT_BG_STEM = 'guillaume-didelet-ivuU1X9ULVk-unsplash_dichrom';

/** Same breakpoints as Writing `<picture>` — intrinsic `w` descriptors align across panel pages. */
const SHARED_PANEL_BG_TIERS = [
  /* `(max-width: 767px)` + low slot → 1620w candidate */
  { tierLabel: '720', viewport: { width: 375, height: 740 } },
  /* Desktop `<img>` srcset @ DPR 1 → 2160w candidate */
  { tierLabel: '1080', viewport: { width: 900, height: 700 } },
  { tierLabel: '1440', viewport: { width: 2500, height: 800 } },
  { tierLabel: '1920', viewport: { width: 3200, height: 800 } },
  { tierLabel: '2400', viewport: { width: 3800, height: 800 } },
] as const;

function tierCasesForUrlStem(stem: string): ResponsivePanelBgCase[] {
  return SHARED_PANEL_BG_TIERS.map(({ tierLabel, viewport }) => ({
    tierLabel,
    viewport,
    urlMatcher: new RegExp(`${stem}_${tierLabel}\\.png`),
  }));
}

declareResponsivePanelBgMatrix({
  suiteTitle: 'Writing (/writing) responsive panel background tiers',
  path: '/writing',
  imgSelector: '.writing-page .page-buttons-panel__media img',
  waitForReady: async (page) => {
    await expect(
      page.locator('.writing-groups.writing-groups--visible'),
    ).toBeVisible({ timeout: 10_000 });
  },
  cases: tierCasesForUrlStem(WRITING_BG_STEM),
});

declareResponsivePanelBgMatrix({
  suiteTitle: 'Home (/) responsive hero background tiers',
  path: '/',
  imgSelector: '.hero-bg__image',
  skipSuiteReason:
    'Hero still uses a single `<img>` without `srcset`; enable when oversampled tiers land.',
  cases: [],
});

declareResponsivePanelBgMatrix({
  suiteTitle: 'Profile (/profile) responsive panel background tiers',
  path: '/profile',
  imgSelector: '.profile-section .page-buttons-panel__media img',
  skipSuiteReason:
    'Panel still uses CSS `--panel-bg`; enable when `<picture>` matches Writing.',
  cases: [],
});

declareResponsivePanelBgMatrix({
  suiteTitle: 'Contact (/contact) responsive panel background tiers',
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
  cases: tierCasesForUrlStem(CONTACT_BG_STEM),
});
