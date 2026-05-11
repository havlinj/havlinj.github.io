import { expect, type Page } from '@playwright/test';
import { readSquareContainment } from './geometry';
import { waitTwoFrames } from './raf';

export type CompositionCase = {
  name: string;
  path: string;
  squareSelector: string;
  requiredInsideSelectors: readonly string[];
};

/** Same composition targets as `square-containment.spec.ts` (hero / profile / writing / contact). */
export const ZOOM_COMPOSITION_CASES: readonly CompositionCase[] = [
  {
    name: 'hero',
    path: '/',
    squareSelector: '.hero',
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
    requiredInsideSelectors: [
      '.writing-page .writing-groups',
      '.writing-page .page-buttons',
    ],
  },
  {
    name: 'contact',
    path: '/contact',
    squareSelector: '.contact-page .page-buttons-panel',
    requiredInsideSelectors: [
      '.contact-page__fit-content',
      '.contact-page__inset-rect--intro',
      '.contact-page__inset-rect--links',
    ],
  },
] as const;

export async function applyDocZoom(page: Page, zoom: number): Promise<void> {
  await page.evaluate((z) => {
    document.documentElement.style.zoom = String(z);
    window.dispatchEvent(new Event('resize'));
  }, zoom);
  await waitTwoFrames(page);
}

export async function resetDocZoom(page: Page): Promise<void> {
  await applyDocZoom(page, 1);
}

export async function readZoomGuardSnapshot(page: Page): Promise<{
  frozen: boolean;
  freezeScale: string;
}> {
  return page.evaluate(() => {
    const main = document.querySelector('main.content');
    const cs = main instanceof HTMLElement ? getComputedStyle(main) : null;
    return {
      frozen:
        document.body.classList.contains('zoom-threshold-exceeded') &&
        main?.classList.contains('zoom-freeze-active') === true,
      freezeScale: cs?.getPropertyValue('--zoom-freeze-scale').trim() ?? '',
    };
  });
}

export async function waitWritingGroupsVisible(page: Page): Promise<void> {
  await expect(
    page.locator('.writing-page .writing-groups.writing-groups--visible'),
  ).toBeVisible({ timeout: 8000 });
}

export async function waitContactFitVisible(page: Page): Promise<void> {
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
      { timeout: 8000 },
    )
    .toBe(true);
}

type InsideResult = {
  ok: boolean;
  missing: string[];
  overflowing: string[];
};

/**
 * Geometry-only layout check (no screenshots): square in `main.content`, key nodes inside square.
 */
export async function assertCompositionLayout(
  page: Page,
  c: CompositionCase,
  opts?: { tolerancePx?: number; label?: string },
): Promise<void> {
  const tol = opts?.tolerancePx ?? 6;
  const label = opts?.label ?? c.name;

  if (c.name === 'writing') {
    await waitWritingGroupsVisible(page);
  }
  if (c.name === 'contact') {
    await waitContactFitVisible(page);
  }

  const containment = await readSquareContainment(page.locator('body'), {
    squareSelector: c.squareSelector,
    containerSelector: 'main.content',
    tolerancePx: tol,
  });
  expect(
    containment.ok,
    `${label}: square containment ${JSON.stringify(containment)}`,
  ).toBe(true);

  const inside = await page.evaluate(
    (cfg: {
      squareSelector: string;
      selectors: readonly string[];
      tolerancePx: number;
    }): InsideResult => {
      const t = cfg.tolerancePx;
      const square = document.querySelector(cfg.squareSelector);
      if (!(square instanceof HTMLElement)) {
        return { ok: false, missing: ['(square)'], overflowing: [] };
      }
      const s = square.getBoundingClientRect();
      const missing: string[] = [];
      const overflowing: string[] = [];

      for (const sel of cfg.selectors) {
        const el = document.querySelector(sel);
        if (!(el instanceof HTMLElement)) {
          missing.push(sel);
          continue;
        }
        const r = el.getBoundingClientRect();
        const within =
          r.left >= s.left - t &&
          r.right <= s.right + t &&
          r.top >= s.top - t &&
          r.bottom <= s.bottom + t;
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
      selectors: c.requiredInsideSelectors,
      tolerancePx: tol,
    },
  );

  const vw = page.viewportSize()?.width ?? 9999;
  const isExtremeMobileContact = c.name === 'contact' && vw <= 430;
  const contactInsetOverflowAllowed = new Set([
    '.contact-page__inset-rect--intro',
    '.contact-page__inset-rect--links',
  ]);
  const insideOk =
    isExtremeMobileContact && inside.overflowing?.length
      ? inside.missing.length === 0 &&
        inside.overflowing.every((sel) => contactInsetOverflowAllowed.has(sel))
      : inside.ok;

  expect(insideOk, `${label}: inside layout ${JSON.stringify(inside)}`).toBe(
    true,
  );
}
