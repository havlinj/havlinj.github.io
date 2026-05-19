import { expect, type Page } from '@playwright/test';

/** Subpixel tolerance when comparing measured What tile insets to section CSS vars. */
export const PROFILE_FRAME_GUTTER_SYNC_TOLERANCE_PX = 1;

export type ProfileFrameGutterSnapshot = {
  sectionBlockPx: number;
  sectionSidePx: number;
  expectedBlockPx: number;
  expectedSidePx: number;
  portraitInsetTopPx: number;
  portraitInsetLeftPx: number;
};

/**
 * Mirrors `syncProfileFrameGuttersFromWhatTile` in src/scripts/profile-frame-gutters.ts.
 */
export async function readProfileFrameGutterSnapshot(
  page: Page,
): Promise<ProfileFrameGutterSnapshot> {
  return page.evaluate(() => {
    const section = document.querySelector('.profile-section');
    const what = document.querySelector('a.prof-tile[href="/what-i-do"]');
    const surface = what?.querySelector('.profile-media-surface');
    const photoBox = document.querySelector('.profile-photo-box');
    if (!(section instanceof HTMLElement)) {
      throw new Error(
        'readProfileFrameGutterSnapshot: missing .profile-section',
      );
    }
    if (!(surface instanceof HTMLElement)) {
      throw new Error(
        'readProfileFrameGutterSnapshot: missing What I do .profile-media-surface',
      );
    }
    if (!(photoBox instanceof HTMLElement)) {
      throw new Error(
        'readProfileFrameGutterSnapshot: missing .profile-photo-box',
      );
    }

    const cs = getComputedStyle(surface);
    const top = parseFloat(cs.top);
    const bottom = parseFloat(cs.bottom);
    const right = parseFloat(cs.right);
    const block =
      Number.isFinite(top) && Number.isFinite(bottom)
        ? (top + bottom) / 2
        : Number.isFinite(bottom)
          ? bottom
          : top;
    const side = Number.isFinite(right) ? right : 0;

    const sectionCs = getComputedStyle(section);
    const boxCs = getComputedStyle(photoBox);
    const parsePx = (raw: string) => {
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    };

    return {
      sectionBlockPx: parsePx(
        sectionCs.getPropertyValue('--profile-frame-gutter-block-px').trim(),
      ),
      sectionSidePx: parsePx(
        sectionCs.getPropertyValue('--profile-frame-gutter-side-px').trim(),
      ),
      expectedBlockPx: block,
      expectedSidePx: side,
      portraitInsetTopPx: parsePx(
        boxCs.getPropertyValue('--profile-tile-media-inset-top').trim(),
      ),
      portraitInsetLeftPx: parsePx(
        boxCs.getPropertyValue('--profile-tile-media-inset-left').trim(),
      ),
    };
  });
}

export function expectProfileFrameGuttersSynced(
  snapshot: ProfileFrameGutterSnapshot,
): void {
  const tol = PROFILE_FRAME_GUTTER_SYNC_TOLERANCE_PX;
  expect(snapshot.expectedBlockPx, 'What tile block gutter').toBeGreaterThan(0);
  expect(
    snapshot.sectionBlockPx,
    'section --profile-frame-gutter-block-px',
  ).toBeGreaterThan(0);
  expect(
    Math.abs(snapshot.sectionBlockPx - snapshot.expectedBlockPx),
    'block gutter must match measured What tile surface',
  ).toBeLessThanOrEqual(tol);
  expect(
    Math.abs(snapshot.sectionSidePx - snapshot.expectedSidePx),
    'side gutter must match measured What tile surface',
  ).toBeLessThanOrEqual(tol);
  expect(
    Math.abs(snapshot.portraitInsetTopPx - snapshot.sectionBlockPx),
    'portrait top inset must use synced block gutter',
  ).toBeLessThanOrEqual(tol);
  expect(
    Math.abs(snapshot.portraitInsetLeftPx - snapshot.sectionSidePx),
    'portrait left inset must use synced side gutter',
  ).toBeLessThanOrEqual(tol);
}
