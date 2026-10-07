/**
 * Responsive Bayer PNG tiers (`*_720.png`, `*_1080.png`, …).
 *
 * The numeric suffix in the filename is NOT the bitmap width in pixels. It is the *intended
 * display width* (~CSS px) the asset was authored for. Files are oversampled (target × 2.5,
 * 2.25, 2.0, 1.8, 1.6) so a matching display size downsamples the Bayer grid.
 *
 * HTML `srcset` `w` descriptors MUST be each image’s *intrinsic pixel width* (PNG IHDR).
 * Do not use the filename number there — a stale descriptor makes the tier selector
 * score a bitmap that is not the file.
 *
 * That srcset is only the no-JS fallback. `initDichromTierSync` measures the painted box
 * (CSS zoom and transforms already included) and loads the tier whose bitmap-to-device
 * ratio is the closest small integer. `sizes="100vw"` does not know the box, the image
 * zoom, or pinch, and browsers are not required to re-pick on zoom.
 */

/** PNG IHDR widths for the full-frame sets (hero, writing, contact, maintenance). */
export const DICHROM_INTRINSIC_WIDTHS = {
  w720: 1800,
  w1080: 2430,
  w1440: 2880,
  w1920: 3456,
  w2400: 3840,
} as const;

export type DichromTier = keyof typeof DICHROM_INTRINSIC_WIDTHS;

export type DichromIntrinsicWidths = {
  readonly [K in DichromTier]: number;
};

export interface DichromSource {
  href: string;
  w: number;
}

export type DichromResponsiveSet = Record<DichromTier, DichromSource>;

/**
 * Smaller Bayer tiles. Filename suffix is intended display CSS px; `w` is the
 * real bitmap width (identify / file).
 */
export const DICHROM_TILE_INTRINSIC_WIDTHS = {
  w160: 480,
  w240: 720,
  w320: 880,
  w480: 1200,
  w640: 1440,
} as const;

export type DichromTileTier = keyof typeof DICHROM_TILE_INTRINSIC_WIDTHS;

export type DichromTileResponsiveSet = Record<DichromTileTier, DichromSource>;

function formatDichromSrcset(entries: readonly DichromSource[]): string {
  return entries.map((s) => `${s.href} ${s.w}w`).join(', ');
}

/** Every tier, in authored order. The sync script parses this; srcset stays the fallback. */
export function dichromCandidateSrcset(
  sources: Record<string, DichromSource>,
): string {
  return formatDichromSrcset(Object.values(sources));
}

/** Build href + intrinsic `w` entries from a path stem (no trailing `_720` suffix). */
export function buildDichromResponsive(
  stem: string,
  widths: DichromIntrinsicWidths = DICHROM_INTRINSIC_WIDTHS,
): DichromResponsiveSet {
  return {
    w720: {
      href: `${stem}_720.png`,
      w: widths.w720,
    },
    w1080: {
      href: `${stem}_1080.png`,
      w: widths.w1080,
    },
    w1440: {
      href: `${stem}_1440.png`,
      w: widths.w1440,
    },
    w1920: {
      href: `${stem}_1920.png`,
      w: widths.w1920,
    },
    w2400: {
      href: `${stem}_2400.png`,
      w: widths.w2400,
    },
  };
}

/** `<source media="(max-width: 767px)">` srcset — 720 + 1080 tiers. */
export function dichromMobileSrcset(sources: DichromResponsiveSet): string {
  return formatDichromSrcset([sources.w720, sources.w1080]);
}

/** Default `<img>` srcset — 1080 through 2400 tiers; `src` uses w1440. */
export function dichromDesktopSrcset(sources: DichromResponsiveSet): string {
  return formatDichromSrcset([
    sources.w1080,
    sources.w1440,
    sources.w1920,
    sources.w2400,
  ]);
}

/** Build href + intrinsic `w` entries from a tile stem (no trailing `_160` suffix). */
export function buildDichromTileResponsive(
  stem: string,
): DichromTileResponsiveSet {
  return {
    w160: {
      href: `${stem}_160.png`,
      w: DICHROM_TILE_INTRINSIC_WIDTHS.w160,
    },
    w240: {
      href: `${stem}_240.png`,
      w: DICHROM_TILE_INTRINSIC_WIDTHS.w240,
    },
    w320: {
      href: `${stem}_320.png`,
      w: DICHROM_TILE_INTRINSIC_WIDTHS.w320,
    },
    w480: {
      href: `${stem}_480.png`,
      w: DICHROM_TILE_INTRINSIC_WIDTHS.w480,
    },
    w640: {
      href: `${stem}_640.png`,
      w: DICHROM_TILE_INTRINSIC_WIDTHS.w640,
    },
  };
}

/** `<source media="(max-width: 767px)">` srcset — 160 + 240 tiers. */
export function dichromTileMobileSrcset(
  sources: DichromTileResponsiveSet,
): string {
  return formatDichromSrcset([sources.w160, sources.w240]);
}

/** Default `<img>` srcset — 240 through 640 tiers; `src` uses w320. */
export function dichromTileDesktopSrcset(
  sources: DichromTileResponsiveSet,
): string {
  return formatDichromSrcset([
    sources.w240,
    sources.w320,
    sources.w480,
    sources.w640,
  ]);
}
