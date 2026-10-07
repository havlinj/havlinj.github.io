import {
  HERO_BG_BITMAP_HEIGHT,
  HERO_BG_BITMAP_WIDTH,
} from '../constants/hero-layout';
import {
  neededDichromBitmapWidth,
  selectDichromCandidate,
  type DichromCandidate,
} from './dichrom-tier-select';

const ROOT_FONT_PX = 16;
const COMPACT_PAD_MAX_VIEWPORT_PX = 430;
const COMPACT_PAD_MIN_REM = 1.15;
const COMPACT_PAD_VW = 0.06;
const COMPACT_PAD_MAX_REM = 2;
const DESKTOP_PAD_REM = 2;
const PANEL_LEFT_INSET_EM = 0.05;

/** Matches `--hero-bg-zoom` in hero.css. */
export const HERO_BG_ZOOM = 1.35;

/**
 * Viewport the preload scanner has to be told about. It cannot run the
 * measurement script. 412 CSS px at 1.75 dpr is the Lighthouse mobile box;
 * the column is the viewport there, so `70ch` does not apply.
 */
export const HERO_SCANNER_VIEWPORT_CSS = 412;
export const HERO_SCANNER_DEVICE_SCALE = 1.75;

export function estimateHeroPaintBox(viewportCss: number): {
  width: number;
  height: number;
} {
  const padRem =
    viewportCss <= COMPACT_PAD_MAX_VIEWPORT_PX
      ? Math.min(
          COMPACT_PAD_MAX_REM,
          Math.max(
            COMPACT_PAD_MIN_REM,
            (COMPACT_PAD_VW * viewportCss) / ROOT_FONT_PX,
          ),
        )
      : DESKTOP_PAD_REM;
  const padPx = padRem * ROOT_FONT_PX;
  const inner = Math.max(0, viewportCss - padPx * 2);
  const insetPx = PANEL_LEFT_INSET_EM * ROOT_FONT_PX;
  const panelWidth = Math.max(0, inner - insetPx);
  return {
    width: panelWidth * HERO_BG_ZOOM,
    height: inner * HERO_BG_ZOOM,
  };
}

export function selectHeroScannerCandidate(
  candidates: readonly DichromCandidate[],
): DichromCandidate | null {
  const box = estimateHeroPaintBox(HERO_SCANNER_VIEWPORT_CSS);
  const devicePx = neededDichromBitmapWidth({
    boxWidthCss: box.width,
    boxHeightCss: box.height,
    aspectWOverH: HERO_BG_BITMAP_WIDTH / HERO_BG_BITMAP_HEIGHT,
    objectFit: 'cover',
    deviceScale: HERO_SCANNER_DEVICE_SCALE,
  });
  return selectDichromCandidate(candidates, devicePx);
}
