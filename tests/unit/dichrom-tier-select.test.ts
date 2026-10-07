import { describe, expect, it } from 'vitest';
import {
  DICHROM_INTRINSIC_WIDTHS,
  DICHROM_TILE_INTRINSIC_WIDTHS,
} from '../../src/constants/dichrom-responsive';
import { dichromHeroEarlyInlineScript } from '../../src/utils/bundle-dichrom-hero-early';
import {
  estimateHeroPaintBox,
  selectHeroScannerCandidate,
} from '../../src/utils/dichrom-hero-estimate';
import {
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

  it('picks the 160 tile when the phone paints it near 480 device px', () => {
    expect(chosenWidth(483, TILE_WIDTHS)).toBe(480);
  });

  it('picks a near 2:1 full-frame tier for a phone panel, not the 1.5x file', () => {
    expect(chosenWidth(1188, FULL_WIDTHS)).toBe(2430);
  });

  it('keeps a clean downsample on a desktop-sized panel', () => {
    expect(chosenWidth(768, FULL_WIDTHS)).toBe(2430);
  });

  it('prefers the lighter hero file when the heavier one is only a hair cleaner', () => {
    const devicePx = 1285;
    expect(dichromTierScore(3840, devicePx)).toBeLessThan(
      dichromTierScore(2430, devicePx),
    );
    expect(chosenWidth(devicePx, FULL_WIDTHS)).toBe(
      DICHROM_INTRINSIC_WIDTHS.w1080,
    );
  });

  it('stays on a heavier file until a lighter one is clearly cleaner', () => {
    const list = candidatesFrom([1000, 2000]);
    const heavier = list[1];
    expect(selectDichromCandidate(list, 1400)?.w).toBe(1000);
    expect(selectDichromCandidate(list, 1400, heavier)?.w).toBe(2000);
    expect(selectDichromCandidate(list, 1000, heavier)?.w).toBe(1000);
    expect(selectDichromCandidate(list, 1600)?.w).toBe(2000);
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
    expect(selectHeroScannerCandidate(candidatesFrom(FULL_WIDTHS))?.w).toBe(
      DICHROM_INTRINSIC_WIDTHS.w1080,
    );
    expect(chosenWidth(1288, FULL_WIDTHS)).toBe(DICHROM_INTRINSIC_WIDTHS.w1080);
    expect(chosenWidth(2101, FULL_WIDTHS)).toBe(DICHROM_INTRINSIC_WIDTHS.w1080);
  });
});
