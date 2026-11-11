import { describe, expect, it } from 'vitest';
import {
  DICHROM_HERO_INTRINSIC_WIDTHS,
  DICHROM_INTRINSIC_WIDTHS,
  DICHROM_TILE_INTRINSIC_WIDTHS,
} from '../../src/constants/dichrom-responsive';
import { dichromHeroEarlyInlineScript } from '../../src/utils/bundle-dichrom-hero-early';
import {
  estimateHeroPaintBox,
  selectHeroScannerCandidate,
} from '../../src/utils/dichrom-hero-estimate';
import {
  devicePxClearOfCoarseDecode,
  dichromDeviceScale,
  dichromTierScore,
  neededDichromBitmapWidth,
  parseDichromCandidates,
  selectDichromCandidate,
  type DichromCandidate,
} from '../../src/utils/dichrom-tier-select';

const FULL_WIDTHS = [
  DICHROM_INTRINSIC_WIDTHS.w720,
  DICHROM_INTRINSIC_WIDTHS.w1080,
  DICHROM_INTRINSIC_WIDTHS.w1440,
  DICHROM_INTRINSIC_WIDTHS.w1920,
  DICHROM_INTRINSIC_WIDTHS.w2400,
] as const;

const HERO_WIDTHS = [
  DICHROM_HERO_INTRINSIC_WIDTHS.w720,
  DICHROM_HERO_INTRINSIC_WIDTHS.w900,
  DICHROM_HERO_INTRINSIC_WIDTHS.w1080,
  DICHROM_HERO_INTRINSIC_WIDTHS.w1440,
  DICHROM_HERO_INTRINSIC_WIDTHS.w1920,
  DICHROM_HERO_INTRINSIC_WIDTHS.w2400,
] as const;

const TILE_WIDTHS = [
  DICHROM_TILE_INTRINSIC_WIDTHS.w160,
  DICHROM_TILE_INTRINSIC_WIDTHS.w240,
  DICHROM_TILE_INTRINSIC_WIDTHS.w320,
  DICHROM_TILE_INTRINSIC_WIDTHS.w480,
  DICHROM_TILE_INTRINSIC_WIDTHS.w640,
] as const;

function candidatesFrom(widths: readonly number[]): DichromCandidate[] {
  return widths.map((w) => ({ href: `/tier-${w}.png`, w }));
}

function chosenWidth(devicePx: number, widths: readonly number[]): number {
  const chosen = selectDichromCandidate(candidatesFrom(widths), devicePx);
  if (!chosen) throw new Error('expected a tier');
  return chosen.w;
}

describe('dichrom tier score', () => {
  it('parses a srcset of intrinsic widths', () => {
    expect(parseDichromCandidates('/a.png 480w, /b.png 720w')).toEqual([
      { href: '/a.png', w: 480 },
      { href: '/b.png', w: 720 },
    ]);
  });

  it('treats the painted box as already zoomed', () => {
    expect(
      neededDichromBitmapWidth({
        boxWidthCss: 400 * 1.2,
        boxHeightCss: 400 * 1.2,
        aspectWOverH: 1,
        objectFit: 'cover',
        deviceScale: 3,
      }),
    ).toBeCloseTo(1440);
  });

  it('cover uses the axis that scales the bitmap', () => {
    expect(
      neededDichromBitmapWidth({
        boxWidthCss: 200,
        boxHeightCss: 200,
        aspectWOverH: 1.24,
        objectFit: 'cover',
        deviceScale: 1,
      }),
    ).toBeCloseTo(248);
  });

  it.each([
    {
      name: 'iPhone 13 maintenance: 1800 would upscale, so 3840 downsamples at 2.06',
      devicePx: 1864,
      widths: FULL_WIDTHS,
      chosen: DICHROM_INTRINSIC_WIDTHS.w2400,
    },
    {
      name: 'Pixel 7 maintenance: sloppy 1:1 loses to an exact 2:1',
      devicePx: 1727,
      widths: FULL_WIDTHS,
      chosen: DICHROM_INTRINSIC_WIDTHS.w1920,
    },
    {
      name: 'iPhone 13 contact cover stays on the near 2:1 file',
      devicePx: 1458,
      widths: FULL_WIDTHS,
      chosen: DICHROM_INTRINSIC_WIDTHS.w1440,
    },
    {
      name: 'Lighthouse hero keeps the lighter file when 3:1 is only a hair cleaner',
      devicePx: 1285,
      widths: HERO_WIDTHS,
      chosen: DICHROM_HERO_INTRINSIC_WIDTHS.w1080,
    },
    {
      name: 'desktop hero at 1280 CSS px and dpr 1',
      devicePx: 1288,
      widths: HERO_WIDTHS,
      chosen: DICHROM_HERO_INTRINSIC_WIDTHS.w1080,
    },
    {
      name: 'phone hero at dpr 3 picks the 900 mid-tier near 1:1',
      devicePx: 2101,
      widths: HERO_WIDTHS,
      chosen: DICHROM_HERO_INTRINSIC_WIDTHS.w900,
    },
    {
      name: 'phone full-frame panel near 2:1, not the 1.5 file',
      devicePx: 1188,
      widths: FULL_WIDTHS,
      chosen: DICHROM_INTRINSIC_WIDTHS.w1080,
    },
    {
      name: 'desktop full-frame panel',
      devicePx: 768,
      widths: FULL_WIDTHS,
      chosen: DICHROM_INTRINSIC_WIDTHS.w1080,
    },
    {
      name: 'phone Why tile stays on 480; the exact 3:1 file must not steal it',
      devicePx: 483,
      widths: TILE_WIDTHS,
      chosen: DICHROM_TILE_INTRINSIC_WIDTHS.w160,
    },
  ])('$name', ({ devicePx, widths, chosen }) => {
    expect(chosenWidth(devicePx, widths)).toBe(chosen);
  });

  it('still records that the heavier hero file scores cleaner at the Lighthouse box', () => {
    expect(dichromTierScore(3840, 1285)).toBeLessThan(
      dichromTierScore(2430, 1285),
    );
  });

  it('does not keep an upscaled file just because it is lighter', () => {
    const list = candidatesFrom([1000, 2000]);
    const heavier = list[1];
    const lighter = list[0];
    expect(selectDichromCandidate(list, 1400)?.w).toBe(2000);
    expect(selectDichromCandidate(list, 1400, lighter)?.w).toBe(2000);
    expect(selectDichromCandidate(list, 1000, heavier)?.w).toBe(1000);
    expect(selectDichromCandidate(list, 1600)?.w).toBe(2000);
    expect(
      selectDichromCandidate(candidatesFrom(FULL_WIDTHS), 1285, {
        href: '/tier-3840.png',
        w: 3840,
      })?.w,
    ).toBe(3840);
    const showingUpscale = candidatesFrom(FULL_WIDTHS)[0];
    expect(
      selectDichromCandidate(candidatesFrom(FULL_WIDTHS), 1864, showingUpscale)
        ?.w,
    ).toBe(DICHROM_INTRINSIC_WIDTHS.w2400);
    expect(
      selectDichromCandidate(candidatesFrom(FULL_WIDTHS), 1727, showingUpscale)
        ?.w,
    ).toBe(DICHROM_INTRINSIC_WIDTHS.w1920);
  });

  it('stretches a phone panel that sits just under an iOS decode step', () => {
    expect(devicePxClearOfCoarseDecode(1864, 3840)).toBe(1920);
    expect(devicePxClearOfCoarseDecode(1727, 3456)).toBe(1728);
    expect(devicePxClearOfCoarseDecode(1458, 2880)).toBe(1458);
    expect(devicePxClearOfCoarseDecode(2101, 2430)).toBe(2101);
    expect(devicePxClearOfCoarseDecode(483, 480)).toBe(483);
  });

  it('folds Chrome page zoom into DPR and Safari page zoom into the CSS factor', () => {
    expect(
      dichromDeviceScale({
        devicePixelRatio: 1.5,
        visualViewportScale: 1,
        dprPageZoom: 1.5,
        cssPageZoom: 1.5,
      }),
    ).toBeCloseTo(1.5);
    expect(
      dichromDeviceScale({
        devicePixelRatio: 2,
        visualViewportScale: 1,
        dprPageZoom: 1,
        cssPageZoom: 1.5,
      }),
    ).toBeCloseTo(3);
    expect(
      dichromDeviceScale({
        devicePixelRatio: 3,
        visualViewportScale: 1.4,
        dprPageZoom: 1,
        cssPageZoom: 1,
      }),
    ).toBeCloseTo(4.2);
  });

  it('scores a 1:1 map cleaner than a halfway ratio', () => {
    expect(dichromTierScore(480, 480)).toBeLessThan(dichromTierScore(720, 480));
  });

  it('inlines the shared selector for the hero first request', () => {
    const script = dichromHeroEarlyInlineScript();
    expect(script).toContain('DichromHeroEarly.assignDichromHeroSrc()');
    expect(script).toContain('getBoundingClientRect');
  });

  it('names the lighthouse hero box with the same selector', () => {
    const box = estimateHeroPaintBox(412);
    expect(box.width).toBeCloseTo(488.4, 0);
    expect(box.height).toBeCloseTo(489.5, 0);
    expect(selectHeroScannerCandidate(candidatesFrom(HERO_WIDTHS))?.w).toBe(
      DICHROM_HERO_INTRINSIC_WIDTHS.w1080,
    );
    expect(chosenWidth(1288, HERO_WIDTHS)).toBe(
      DICHROM_HERO_INTRINSIC_WIDTHS.w1080,
    );
    expect(chosenWidth(2101, HERO_WIDTHS)).toBe(
      DICHROM_HERO_INTRINSIC_WIDTHS.w900,
    );
  });
});
