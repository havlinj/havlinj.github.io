/**
 * Responsive Bayer PNG tiers (`*_720.png`, `*_1080.png`, …).
 *
 * The numeric suffix in the filename is NOT the bitmap width in pixels. It is the *intended
 * display width* (~CSS px) the asset was authored for. Files are oversampled (e.g. target × ~2.25)
 * so the browser downsamples a high-res Bayer grid → smoother pattern, less moiré.
 *
 * HTML `srcset` `w` descriptors MUST be each image’s *intrinsic pixel width* (what `identify`
 * reports). Do not use the filename number there — wrong descriptor breaks resource selection.
 */

export const DICHROM_INTRINSIC_WIDTHS = {
  w720: 1620,
  w1080: 2160,
  w1440: 2736,
  w1920: 3360,
  w2400: 3840,
} as const;

export type DichromTier = keyof typeof DICHROM_INTRINSIC_WIDTHS;

export interface DichromSource {
  href: string;
  w: number;
}

export type DichromResponsiveSet = Record<DichromTier, DichromSource>;

/** Build href + intrinsic `w` entries from a path stem (no trailing `_720` suffix). */
export function buildDichromResponsive(stem: string): DichromResponsiveSet {
  return {
    w720: {
      href: `${stem}_720.png`,
      w: DICHROM_INTRINSIC_WIDTHS.w720,
    },
    w1080: {
      href: `${stem}_1080.png`,
      w: DICHROM_INTRINSIC_WIDTHS.w1080,
    },
    w1440: {
      href: `${stem}_1440.png`,
      w: DICHROM_INTRINSIC_WIDTHS.w1440,
    },
    w1920: {
      href: `${stem}_1920.png`,
      w: DICHROM_INTRINSIC_WIDTHS.w1920,
    },
    w2400: {
      href: `${stem}_2400.png`,
      w: DICHROM_INTRINSIC_WIDTHS.w2400,
    },
  };
}

/** `<source media="(max-width: 767px)">` srcset — 720 + 1080 tiers. */
export function dichromMobileSrcset(sources: DichromResponsiveSet): string {
  return `${sources.w720.href} ${sources.w720.w}w, ${sources.w1080.href} ${sources.w1080.w}w`;
}

/** Default `<img>` srcset — 1080 through 2400 tiers; `src` uses w1440. */
export function dichromDesktopSrcset(sources: DichromResponsiveSet): string {
  return `${sources.w1080.href} ${sources.w1080.w}w, ${sources.w1440.href} ${sources.w1440.w}w, ${sources.w1920.href} ${sources.w1920.w}w, ${sources.w2400.href} ${sources.w2400.w}w`;
}
