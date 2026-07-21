import { test } from '@playwright/test';
import {
  PAGE_REVEAL_SELECTORS,
  type PageRevealRoute,
  expectSharedPageRevealTransition,
  gotoMainPageRevealReady,
} from './helpers/page-reveal';

const MAIN_PAGE_REVEAL_ROUTES: PageRevealRoute[] = [
  'hero',
  'writing',
  'contact',
  'profile',
];

test.describe('Main pages — shared content reveal fade (0.22s ease-out)', () => {
  for (const route of MAIN_PAGE_REVEAL_ROUTES) {
    test(`${route} uses opacity ${PAGE_REVEAL_SELECTORS[route]} transition`, async ({
      page,
    }) => {
      await gotoMainPageRevealReady(page, route);
      await expectSharedPageRevealTransition(
        page,
        PAGE_REVEAL_SELECTORS[route],
      );
    });
  }
});
