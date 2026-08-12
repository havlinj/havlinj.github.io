import { test, expect, type Page } from '@playwright/test';
import { CONTENT_PANEL_SELECTORS } from '../src/constants/content-panel';
import {
  gotoProfileWhenReady,
  waitContactFitVisible,
  waitWritingGroupsVisible,
} from './helpers';

/*
 * Every content panel route shares one skeleton: nav → page title → content panel → footer.
 * Hero used to sit 1.1rem below its title (plus a masking strip) and profile 1.5rem, which
 * put the panel top, panel bottom and footer at three different heights. The gap now comes
 * only from --content-panel-title-gap, so all routes must line up.
 */

const RHYTHM_TOLERANCE_PX = 1;

const VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const;

type RhythmSnapshot = {
  navBottom: number;
  titleBottom: number;
  panelTop: number;
  panelLeft: number;
  panelWidth: number;
  panelHeight: number;
  panelBottom: number;
  footerTop: number;
  titleGap: number;
};

const ROUTES = [
  { name: 'hero', path: '/', navSelector: '.hero-header' },
  { name: 'profile', path: '/profile', navSelector: '.site-header' },
  { name: 'writing', path: '/writing', navSelector: '.site-header' },
  { name: 'contact', path: '/contact', navSelector: '.site-header' },
] as const;

type RouteName = (typeof ROUTES)[number]['name'];

async function gotoRouteWhenReady(page: Page, name: RouteName): Promise<void> {
  if (name === 'profile') {
    await gotoProfileWhenReady(page);
    return;
  }
  await page.goto(ROUTES.find((r) => r.name === name)!.path);
  if (name === 'hero') {
    await page.locator('section.hero.hero--ready').waitFor({ timeout: 8000 });
    return;
  }
  if (name === 'writing') {
    await waitWritingGroupsVisible(page);
    return;
  }
  await waitContactFitVisible(page);
}

async function readRhythmSnapshot(
  page: Page,
  panelSelector: string,
  navSelector: string,
): Promise<RhythmSnapshot> {
  return page.evaluate(
    (cfg: { panelSelector: string; navSelector: string }) => {
      const pick = (selector: string): HTMLElement => {
        const el = document.querySelector(selector);
        if (!(el instanceof HTMLElement)) {
          throw new Error(`readRhythmSnapshot: missing ${selector}`);
        }
        return el;
      };
      const pageTop = -document.documentElement.getBoundingClientRect().top;
      const nav = pick(cfg.navSelector).getBoundingClientRect();
      const title = pick('h1.page-title').getBoundingClientRect();
      const panel = pick(cfg.panelSelector).getBoundingClientRect();
      const footer = pick('.site-footer').getBoundingClientRect();
      return {
        navBottom: nav.bottom + pageTop,
        titleBottom: title.bottom + pageTop,
        panelTop: panel.top + pageTop,
        panelLeft: panel.left,
        panelWidth: panel.width,
        panelHeight: panel.height,
        panelBottom: panel.bottom + pageTop,
        footerTop: footer.top + pageTop,
        titleGap: panel.top - title.bottom,
      };
    },
    { panelSelector, navSelector },
  );
}

test.describe('Content panel vertical rhythm', () => {
  for (const viewport of VIEWPORTS) {
    test(`all routes share nav, title, panel and footer offsets at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);

      const snapshots = new Map<RouteName, RhythmSnapshot>();
      for (const route of ROUTES) {
        await gotoRouteWhenReady(page, route.name);
        snapshots.set(
          route.name,
          await readRhythmSnapshot(
            page,
            CONTENT_PANEL_SELECTORS[route.name],
            route.navSelector,
          ),
        );
      }

      const [reference, ...others] = [...snapshots.entries()];
      for (const [name, snapshot] of others) {
        for (const key of Object.keys(snapshot) as (keyof RhythmSnapshot)[]) {
          expect(
            Math.abs(snapshot[key] - reference[1][key]),
            `${name}.${key}=${snapshot[key]} differs from ${reference[0]}.${key}=${reference[1][key]}`,
          ).toBeLessThanOrEqual(RHYTHM_TOLERANCE_PX);
        }
      }
    });
  }

  test('content panel is square and the title gap matches --content-panel-title-gap', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    for (const route of ROUTES) {
      await gotoRouteWhenReady(page, route.name);
      const expectedGap = await page.evaluate(() => {
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue('--content-panel-title-gap')
          .trim();
        const rootFontSize = parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        );
        return raw.endsWith('rem')
          ? parseFloat(raw) * rootFontSize
          : parseFloat(raw);
      });

      const snapshot = await readRhythmSnapshot(
        page,
        CONTENT_PANEL_SELECTORS[route.name],
        route.navSelector,
      );

      expect(
        Math.abs(snapshot.panelWidth - snapshot.panelHeight),
        `${route.name} content panel is not square: ${snapshot.panelWidth}x${snapshot.panelHeight}`,
      ).toBeLessThanOrEqual(RHYTHM_TOLERANCE_PX);
      expect(
        Math.abs(snapshot.titleGap - expectedGap),
        `${route.name} title gap ${snapshot.titleGap} != ${expectedGap}`,
      ).toBeLessThanOrEqual(RHYTHM_TOLERANCE_PX);
      expect(
        Math.abs(snapshot.footerTop - snapshot.panelBottom),
        `${route.name} leaves a gap between content panel and footer`,
      ).toBeLessThanOrEqual(RHYTHM_TOLERANCE_PX);
    }
  });
});
