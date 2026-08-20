import { expect, type Page } from '@playwright/test';
import { CONTENT_PANEL_SELECTORS } from '../../src/constants/content-panel';
import { readContentPanelContainment } from './geometry';
import { waitTwoFrames } from './raf';

export type ContentPanelCase = {
  name: ContentPanelRouteName;
  path: string;
  contentPanelSelector: string;
  requiredInsideSelectors: readonly string[];
};

type ContentPanelRouteName = keyof typeof CONTENT_PANEL_SELECTORS;

/** Same content-panel routes as `content-panel-containment.spec.ts`. */
export const CONTENT_PANEL_CASES: readonly ContentPanelCase[] = [
  {
    name: 'hero',
    path: '/',
    contentPanelSelector: CONTENT_PANEL_SELECTORS.hero,
    requiredInsideSelectors: ['.hero-content', '.tagline'],
  },
  {
    name: 'profile',
    path: '/profile',
    contentPanelSelector: CONTENT_PANEL_SELECTORS.profile,
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
    contentPanelSelector: CONTENT_PANEL_SELECTORS.writing,
    requiredInsideSelectors: [
      '.writing-page .writing-groups',
      '.writing-page .page-buttons',
    ],
  },
  {
    name: 'contact',
    path: '/contact',
    contentPanelSelector: CONTENT_PANEL_SELECTORS.contact,
    requiredInsideSelectors: [
      '.contact-page__fit-content',
      '.contact-page__inset-rect--links',
    ],
  },
] as const;

/** Route maintenance notice — only served under the maintenance Playwright fixture. */
export const MAINTENANCE_CONTENT_PANEL_CASE: ContentPanelCase = {
  name: 'maintenance',
  path: '/writing',
  contentPanelSelector: CONTENT_PANEL_SELECTORS.maintenance,
  requiredInsideSelectors: [
    '.route-maintenance-panel__copy',
    '.route-maintenance-panel__headline',
    '.route-maintenance-panel__route',
    '.route-maintenance-panel__info',
  ],
};

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

/**
 * Raise visualViewport.scale without changing innerWidth — simulates pinch zoom
 * for ZoomGuard (viewport squeeze alone must not freeze).
 */
export async function simulateVisualViewportScale(
  page: Page,
  scale: number,
): Promise<void> {
  await page.evaluate((s) => {
    const real = window.visualViewport;
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        get scale() {
          return s;
        },
        get width() {
          return real?.width ?? window.innerWidth;
        },
        get height() {
          return real?.height ?? window.innerHeight;
        },
        get offsetLeft() {
          return real?.offsetLeft ?? 0;
        },
        get offsetTop() {
          return real?.offsetTop ?? 0;
        },
        get pageLeft() {
          return real?.pageLeft ?? 0;
        },
        get pageTop() {
          return real?.pageTop ?? 0;
        },
        addEventListener: real
          ? real.addEventListener.bind(real)
          : () => undefined,
        removeEventListener: real
          ? real.removeEventListener.bind(real)
          : () => undefined,
        dispatchEvent: real ? real.dispatchEvent.bind(real) : () => false,
      },
    });
    window.dispatchEvent(new Event('resize'));
    real?.dispatchEvent(new Event('resize'));
  }, scale);
  await waitTwoFrames(page);
}

export async function readMainVisualWidthPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const main = document.querySelector('main.content');
    if (!(main instanceof HTMLElement)) return 0;
    return main.getBoundingClientRect().width;
  });
}

export async function readContentWidthChPx(page: Page): Promise<{
  minChPx: number;
  maxChPx: number;
}> {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:absolute;visibility:hidden;font:inherit;width:1ch';
    document.body.appendChild(probe);
    const ch = probe.getBoundingClientRect().width || 8;
    probe.remove();
    const root = getComputedStyle(document.documentElement);
    const minCh =
      parseFloat(root.getPropertyValue('--content-min-width')) || 40;
    const maxCh = parseFloat(root.getPropertyValue('--content-width')) || 70;
    return { minChPx: minCh * ch, maxChPx: maxCh * ch };
  });
}

export async function forceZoomFreezeDom(
  page: Page,
  freezeScale: number,
): Promise<void> {
  await page.evaluate((s) => {
    const main = document.querySelector('main.content');
    document.body.classList.add('zoom-threshold-exceeded');
    if (main instanceof HTMLElement) {
      main.classList.add('zoom-freeze-active');
      main.style.setProperty('--zoom-freeze-scale', String(s));
    }
  }, freezeScale);
  await waitTwoFrames(page);
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

export async function waitMaintenancePanelVisible(page: Page): Promise<void> {
  await expect(page.locator('.route-maintenance-panel')).toBeVisible({
    timeout: 8000,
  });
}

type InsideResult = {
  ok: boolean;
  missing: string[];
  overflowing: string[];
};

/**
 * Geometry-only layout check (no screenshots): content panel in `main.content`, key nodes inside.
 */
export async function assertContentPanelLayout(
  page: Page,
  c: ContentPanelCase,
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
  if (c.name === 'maintenance') {
    await waitMaintenancePanelVisible(page);
  }

  const containment = await readContentPanelContainment(page.locator('body'), {
    contentPanelSelector: c.contentPanelSelector,
    containerSelector: 'main.content',
    tolerancePx: tol,
  });
  expect(
    containment.ok,
    `${label}: content panel containment ${JSON.stringify(containment)}`,
  ).toBe(true);

  const inside = await page.evaluate(
    (cfg: {
      contentPanelSelector: string;
      selectors: readonly string[];
      tolerancePx: number;
    }): InsideResult => {
      const t = cfg.tolerancePx;
      const contentPanel = document.querySelector(cfg.contentPanelSelector);
      if (!(contentPanel instanceof HTMLElement)) {
        return { ok: false, missing: ['(content panel)'], overflowing: [] };
      }
      const panelRect = contentPanel.getBoundingClientRect();
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
          r.left >= panelRect.left - t &&
          r.right <= panelRect.right + t &&
          r.top >= panelRect.top - t &&
          r.bottom <= panelRect.bottom + t;
        if (!within) overflowing.push(sel);
      }

      return {
        ok: missing.length === 0 && overflowing.length === 0,
        missing,
        overflowing,
      };
    },
    {
      contentPanelSelector: c.contentPanelSelector,
      selectors: c.requiredInsideSelectors,
      tolerancePx: tol,
    },
  );

  const vw = page.viewportSize()?.width ?? 9999;
  const isExtremeMobileContact = c.name === 'contact' && vw <= 430;
  const isExtremeMobileMaintenance = c.name === 'maintenance' && vw <= 430;
  const contactInsetOverflowAllowed = new Set([
    '.contact-page__inset-rect--links',
  ]);
  const maintenanceDesktopOverflowAllowed = new Set([
    '.route-maintenance-panel__copy',
  ]);
  const maintenanceMobileOverflowAllowed = new Set(c.requiredInsideSelectors);

  let insideOk = inside.ok;
  if (inside.overflowing?.length) {
    if (isExtremeMobileMaintenance) {
      insideOk =
        inside.missing.length === 0 &&
        inside.overflowing.every((sel) =>
          maintenanceMobileOverflowAllowed.has(sel),
        );
    } else if (c.name === 'maintenance') {
      insideOk =
        inside.missing.length === 0 &&
        inside.overflowing.every((sel) =>
          maintenanceDesktopOverflowAllowed.has(sel),
        );
    } else if (isExtremeMobileContact) {
      insideOk =
        inside.missing.length === 0 &&
        inside.overflowing.every((sel) => contactInsetOverflowAllowed.has(sel));
    }
  }

  expect(insideOk, `${label}: inside layout ${JSON.stringify(inside)}`).toBe(
    true,
  );
}
