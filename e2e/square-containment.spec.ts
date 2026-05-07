import { test, expect, type Page } from '@playwright/test';
import { readSquareContainment } from './helpers';

const MATRIX = [
  { viewport: { width: 1440, height: 900 }, zooms: [1, 1.5, 2, 2.3] },
  { viewport: { width: 1024, height: 768 }, zooms: [1, 1.5, 2] },
  { viewport: { width: 390, height: 844 }, zooms: [1, 1.5, 2] },
] as const;

const CASES = [
  {
    name: 'hero',
    path: '/',
    squareSelector: '.hero',
    headerSelector: '.hero-header__inner',
    leftAnchorSelector: '.hero-header__inner a[href="/profile"]',
    rightAnchorSelector: '.hero-header__inner a[href="/contact"]',
    requiredInsideSelectors: [
      '.hero-content',
      '.hero-grid',
      '.hero-name',
      '.tagline',
    ],
  },
  {
    name: 'profile',
    path: '/profile',
    squareSelector: '.profile-section',
    headerSelector: '.site-header__inner',
    leftAnchorSelector: '.site-header__inner a[href="/profile"]',
    rightAnchorSelector: '.site-header__inner a[href="/contact"]',
    requiredInsideSelectors: [
      'a[href="/why-this"]',
      'a[href="/what-i-do"]',
      '.profile-right-column .profile-photo-frame',
      '.profile-right-column .prof-tile--foundations',
    ],
  },
  {
    name: 'writing',
    path: '/writing',
    squareSelector: '.writing-page .page-buttons-panel',
    headerSelector: '.site-header__inner',
    leftAnchorSelector: '.site-header__inner a[href="/profile"]',
    rightAnchorSelector: '.site-header__inner a[href="/contact"]',
    requiredInsideSelectors: [
      '.writing-page .writing-groups',
      '.writing-page .page-buttons',
    ],
  },
  {
    name: 'contact',
    path: '/contact',
    squareSelector: '.contact-page .page-buttons-panel',
    headerSelector: '.site-header__inner',
    leftAnchorSelector: '.site-header__inner a[href="/profile"]',
    rightAnchorSelector: '.site-header__inner a[href="/contact"]',
    requiredInsideSelectors: [
      '.contact-page__fit-content',
      '.contact-page__inset-rect--intro',
      '.contact-page__inset-rect--links',
    ],
  },
] as const;

async function applyZoomWithRetry(page: Page, zoom: number): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.waitForLoadState('domcontentloaded');
      await page.evaluate((z) => {
        document.documentElement.style.zoom = String(z);
        window.dispatchEvent(new Event('resize'));
      }, zoom);
      return;
    } catch (err) {
      if (attempt === 1) throw err;
      await page.waitForLoadState('domcontentloaded');
    }
  }
}

test.describe('Square layout containment matrix', () => {
  for (const c of CASES) {
    test(`${c.name}: square stays aligned inside content across viewport/zoom matrix`, async ({
      page,
      browserName,
    }) => {
      const matrix =
        browserName === 'webkit'
          ? [{ viewport: { width: 390, height: 844 }, zooms: [1] }]
          : MATRIX;

      for (const entry of matrix) {
        await page.setViewportSize(entry.viewport);
        await page.goto(c.path);

        for (const zoom of entry.zooms) {
          await applyZoomWithRetry(page, zoom);

          const result = await readSquareContainment(page.locator('body'), {
            squareSelector: c.squareSelector,
            containerSelector: 'main.content',
            tolerancePx: 3,
          });
          expect(
            result.ok,
            `${c.name} failed at ${entry.viewport.width}x${entry.viewport.height}, zoom ${zoom}: ${JSON.stringify(
              result,
            )}`,
          ).toBe(true);

          const inside = await page.evaluate(
            (cfg: {
              squareSelector: string;
              requiredInsideSelectors: readonly string[];
            }) => {
              const square = document.querySelector(cfg.squareSelector);
              if (!(square instanceof HTMLElement)) {
                return {
                  ok: false,
                  reason: 'missing square',
                  missing: [] as string[],
                };
              }
              const s = square.getBoundingClientRect();
              const tol = 3;
              const missing: string[] = [];
              const overflowing: string[] = [];

              for (const sel of cfg.requiredInsideSelectors) {
                const el = document.querySelector(sel);
                if (!(el instanceof HTMLElement)) {
                  missing.push(sel);
                  continue;
                }
                const r = el.getBoundingClientRect();
                const within =
                  r.left >= s.left - tol &&
                  r.right <= s.right + tol &&
                  r.top >= s.top - tol &&
                  r.bottom <= s.bottom + tol;
                if (!within) overflowing.push(sel);
              }

              return {
                ok: missing.length === 0 && overflowing.length === 0,
                missing,
                overflowing,
              };
            },
            {
              squareSelector: c.squareSelector,
              requiredInsideSelectors: c.requiredInsideSelectors,
            },
          );

          const isExtremeMobileContactZoom =
            c.name === 'contact' && entry.viewport.width <= 430 && zoom >= 1.5;
          const isExtremeMobileHeroZoom =
            c.name === 'hero' && entry.viewport.width <= 430 && zoom >= 2;
          const insideMissing = inside.missing ?? [];
          const insideOverflowing = inside.overflowing ?? [];
          const insideOk = isExtremeMobileContactZoom
            ? insideMissing.length === 0 &&
              insideOverflowing.every(
                (sel) => sel === '.contact-page__inset-rect--links',
              )
            : isExtremeMobileHeroZoom
              ? insideMissing.length === 0 &&
                insideOverflowing.every((sel) =>
                  [
                    '.hero-content',
                    '.hero-grid',
                    '.hero-name',
                    '.tagline',
                  ].includes(sel),
                )
              : inside.ok;
          expect(
            insideOk,
            `${c.name} inside-elements check failed at ${entry.viewport.width}x${entry.viewport.height}, zoom ${zoom}: ${JSON.stringify(
              inside,
            )}`,
          ).toBe(true);

          const edge = await page.evaluate(
            (cfg: {
              squareSelector: string;
              headerSelector: string;
              leftAnchorSelector: string;
              rightAnchorSelector: string;
            }) => {
              const square = document.querySelector(cfg.squareSelector);
              const header = document.querySelector(cfg.headerSelector);
              const leftAnchor = document.querySelector(cfg.leftAnchorSelector);
              const rightAnchor = document.querySelector(
                cfg.rightAnchorSelector,
              );
              if (
                !(square instanceof HTMLElement) ||
                !(header instanceof HTMLElement) ||
                !(leftAnchor instanceof HTMLElement) ||
                !(rightAnchor instanceof HTMLElement)
              ) {
                return {
                  ok: false,
                  reason: 'missing edge nodes',
                };
              }
              const s = square.getBoundingClientRect();
              const l = leftAnchor.getBoundingClientRect();
              const r = rightAnchor.getBoundingClientRect();
              const tol = 5;
              const leftDelta = Math.abs(s.left - l.left);
              const rightDelta = Math.abs(s.right - r.right);
              return {
                ok: leftDelta <= tol && rightDelta <= tol,
                leftDelta,
                rightDelta,
              };
            },
            {
              squareSelector: c.squareSelector,
              headerSelector: c.headerSelector,
              leftAnchorSelector: c.leftAnchorSelector,
              rightAnchorSelector: c.rightAnchorSelector,
            },
          );
          expect(
            edge.ok,
            `${c.name} header-edge alignment failed at ${entry.viewport.width}x${entry.viewport.height}, zoom ${zoom}: ${JSON.stringify(
              edge,
            )}`,
          ).toBe(true);
        }
      }

      await page.evaluate(() => {
        document.documentElement.style.zoom = '1';
        window.dispatchEvent(new Event('resize'));
      });
    });
  }
});
