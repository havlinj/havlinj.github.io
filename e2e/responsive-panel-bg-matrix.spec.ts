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
import { declareResponsivePanelBgMatrix } from './helpers/responsive-panel-bg-matrix';

const WRITING_BG_STEM = 'weichao-deng-k0JQkPtfN3s-unsplash_dichrom';

declareResponsivePanelBgMatrix({
  suiteTitle: 'Writing (/writing) responsive panel background tiers',
  path: '/writing',
  imgSelector: '.writing-page .page-buttons-panel__media img',
  waitForReady: async (page) => {
    await expect(
      page.locator('.writing-groups.writing-groups--visible'),
    ).toBeVisible({ timeout: 10_000 });
  },
  cases: [
    /* `(max-width: 767px)` + low slot → 1620w candidate */
    {
      tierLabel: '720',
      viewport: { width: 375, height: 740 },
      urlMatcher: new RegExp(`${WRITING_BG_STEM}_720\\.png`),
    },
    /* Desktop `<img>` srcset @ DPR 1 → 2160w candidate */
    {
      tierLabel: '1080',
      viewport: { width: 900, height: 700 },
      urlMatcher: new RegExp(`${WRITING_BG_STEM}_1080\\.png`),
    },
    {
      tierLabel: '1440',
      viewport: { width: 2500, height: 800 },
      urlMatcher: new RegExp(`${WRITING_BG_STEM}_1440\\.png`),
    },
    {
      tierLabel: '1920',
      viewport: { width: 3200, height: 800 },
      urlMatcher: new RegExp(`${WRITING_BG_STEM}_1920\\.png`),
    },
    {
      tierLabel: '2400',
      viewport: { width: 3800, height: 800 },
      urlMatcher: new RegExp(`${WRITING_BG_STEM}_2400\\.png`),
    },
  ],
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
  skipSuiteReason:
    'Panel still uses CSS `--panel-bg`; enable when `<picture>` matches Writing.',
  cases: [],
});
