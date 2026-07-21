import { expect, type Page } from '@playwright/test';
import {
  PAGE_REVEAL_OPACITY_DURATION_S,
  PAGE_REVEAL_OPACITY_EASING,
  PAGE_REVEAL_OPACITY_TRANSITION,
  PAGE_REVEAL_SELECTORS,
  type PageRevealRoute,
} from '../../src/constants/page-reveal';
import { gotoProfileWhenReady } from './navigation';
import { waitContactFitVisible, waitWritingGroupsVisible } from './zoom-guard';

export {
  PAGE_REVEAL_OPACITY_DURATION_S,
  PAGE_REVEAL_OPACITY_EASING,
  PAGE_REVEAL_OPACITY_TRANSITION,
  PAGE_REVEAL_SELECTORS,
};

/** Normalize computed `transition` to `opacity <duration> <easing>`. */
export function normalizeOpacityTransition(raw: string): string | null {
  const match = raw
    .trim()
    .match(/opacity\s+([\d.]+m?s)\s+(ease-out|ease-in-out|ease|linear)/);
  if (!match) return null;
  return `opacity ${match[1]} ${match[2]}`;
}

export async function readOpacityTransition(
  page: Page,
  selector: string,
): Promise<string | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!(el instanceof HTMLElement)) return null;
    return getComputedStyle(el).transition;
  }, selector);
}

export async function expectSharedPageRevealTransition(
  page: Page,
  selector: string,
): Promise<void> {
  const transition = await readOpacityTransition(page, selector);
  expect(transition, `transition on ${selector}`).toBeTruthy();
  expect(normalizeOpacityTransition(transition!)).toBe(
    PAGE_REVEAL_OPACITY_TRANSITION,
  );
}

export async function waitForOpacityRevealComplete(
  page: Page,
  selector: string,
): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!(el instanceof HTMLElement)) return false;
      return Number.parseFloat(getComputedStyle(el).opacity) >= 0.99;
    },
    selector,
    { timeout: 8000 },
  );
}

export async function gotoMainPageRevealReady(
  page: Page,
  route: PageRevealRoute,
): Promise<void> {
  switch (route) {
    case 'hero':
      await page.goto('/');
      await page.locator('section.hero.hero--ready').waitFor({
        state: 'attached',
        timeout: 15000,
      });
      await waitForOpacityRevealComplete(page, PAGE_REVEAL_SELECTORS.hero);
      return;
    case 'writing':
      await page.goto('/writing');
      await waitWritingGroupsVisible(page);
      await waitForOpacityRevealComplete(page, PAGE_REVEAL_SELECTORS.writing);
      return;
    case 'contact':
      await page.goto('/contact');
      await waitContactFitVisible(page);
      await waitForOpacityRevealComplete(page, PAGE_REVEAL_SELECTORS.contact);
      return;
    case 'profile':
      await gotoProfileWhenReady(page);
      return;
  }
}

export type ProfileLayoutSnapshot = {
  labelFontPx: string;
  blockGutterPx: string;
  sideGutterPx: string;
  frames: Array<{ width: number; height: number; left: number; top: number }>;
};

export async function readProfileLayoutSnapshot(
  page: Page,
): Promise<ProfileLayoutSnapshot> {
  return page.evaluate(() => {
    const section = document.querySelector('.profile-section');
    if (!(section instanceof HTMLElement)) {
      throw new Error('readProfileLayoutSnapshot: missing .profile-section');
    }
    const cs = getComputedStyle(section);
    const frames = Array.from(
      section.querySelectorAll('.prof-tile, .profile-photo-frame'),
    ).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        width: Math.round(r.width * 1000) / 1000,
        height: Math.round(r.height * 1000) / 1000,
        left: Math.round(r.left * 1000) / 1000,
        top: Math.round(r.top * 1000) / 1000,
      };
    });
    return {
      labelFontPx: cs
        .getPropertyValue('--profile-tile-label-font-size')
        .trim(),
      blockGutterPx: section.style
        .getPropertyValue('--profile-frame-gutter-block-px')
        .trim(),
      sideGutterPx: section.style
        .getPropertyValue('--profile-frame-gutter-side-px')
        .trim(),
      frames,
    };
  });
}

/** Allow subpixel drift after ResizeObserver defer window closes. */
export const PROFILE_LAYOUT_STABILITY_TOLERANCE_PX = 0.5;

export function expectProfileLayoutStable(
  before: ProfileLayoutSnapshot,
  after: ProfileLayoutSnapshot,
): void {
  expect(after.labelFontPx).toBe(before.labelFontPx);
  expect(after.blockGutterPx).toBe(before.blockGutterPx);
  expect(after.sideGutterPx).toBe(before.sideGutterPx);
  expect(after.frames).toHaveLength(before.frames.length);
  for (let i = 0; i < before.frames.length; i += 1) {
    const a = after.frames[i]!;
    const b = before.frames[i]!;
    expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(
      PROFILE_LAYOUT_STABILITY_TOLERANCE_PX,
    );
    expect(Math.abs(a.height - b.height)).toBeLessThanOrEqual(
      PROFILE_LAYOUT_STABILITY_TOLERANCE_PX,
    );
    expect(Math.abs(a.left - b.left)).toBeLessThanOrEqual(
      PROFILE_LAYOUT_STABILITY_TOLERANCE_PX,
    );
    expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(
      PROFILE_LAYOUT_STABILITY_TOLERANCE_PX,
    );
  }
}
