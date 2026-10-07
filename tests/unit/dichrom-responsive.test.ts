import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildDichromResponsive,
  buildDichromTileResponsive,
  dichromCandidateSrcset,
  dichromDesktopSrcset,
  dichromMobileSrcset,
  dichromTileDesktopSrcset,
  dichromTileMobileSrcset,
  DICHROM_INTRINSIC_WIDTHS,
  DICHROM_TILE_INTRINSIC_WIDTHS,
} from '../../src/constants/dichrom-responsive';

describe('dichrom-responsive', () => {
  const stem = '/assets/pages/writing/foo_dichrom';
  const sources = buildDichromResponsive(stem);

  it('buildDichromResponsive maps intrinsic widths to hrefs', () => {
    expect(sources.w720).toEqual({
      href: `${stem}_720.png`,
      w: DICHROM_INTRINSIC_WIDTHS.w720,
    });
    expect(sources.w2400.w).toBe(3840);
  });

  it('dichromMobileSrcset lists 720 and 1080 tiers', () => {
    expect(dichromMobileSrcset(sources)).toBe(
      `${stem}_720.png 1800w, ${stem}_1080.png 2430w`,
    );
  });

  it('dichromDesktopSrcset lists 1080 through 2400 tiers', () => {
    expect(dichromDesktopSrcset(sources)).toBe(
      `${stem}_1080.png 2430w, ${stem}_1440.png 2880w, ${stem}_1920.png 3456w, ${stem}_2400.png 3840w`,
    );
  });

  it('dichromCandidateSrcset lists every tier for the sync script', () => {
    expect(dichromCandidateSrcset(sources)).toBe(
      `${stem}_720.png 1800w, ${stem}_1080.png 2430w, ${stem}_1440.png 2880w, ${stem}_1920.png 3456w, ${stem}_2400.png 3840w`,
    );
  });

  it('full-frame descriptors match the PNG pixel widths', () => {
    const files = [
      'public/assets/hero/vackground-com-agUC-v_D1iI-unsplash_dichrom',
      'public/assets/pages/maintenance/frankie-cordoba-s8Y5e0DNiro-unsplash_dichrom',
      'public/assets/pages/writing/weichao-deng-k0JQkPtfN3s-unsplash_dichrom',
      'public/assets/pages/contact/guillaume-didelet-ivuU1X9ULVk-unsplash_dichrom',
      'public/assets/pages/profile/jiesuang-ng-WKL3Q906OR4-unsplash_dichrom',
    ];
    const tiers = [
      ['720', DICHROM_INTRINSIC_WIDTHS.w720],
      ['1080', DICHROM_INTRINSIC_WIDTHS.w1080],
      ['1440', DICHROM_INTRINSIC_WIDTHS.w1440],
      ['1920', DICHROM_INTRINSIC_WIDTHS.w1920],
      ['2400', DICHROM_INTRINSIC_WIDTHS.w2400],
    ] as const;
    for (const stemPath of files) {
      for (const [suffix, width] of tiers) {
        const header = readFileSync(`${stemPath}_${suffix}.png`).subarray(
          16,
          24,
        );
        expect(header.readUInt32BE(0), `${stemPath}_${suffix}`).toBe(width);
      }
    }
  });
});

describe('dichrom tile responsive', () => {
  const stem =
    '/assets/pages/profile/foundations/museum-of-new-zealand-te-papa-tongarewa-bAdYMC4JXlQ-unsplash_dichrom_collage';
  const sources = buildDichromTileResponsive(stem);

  it('buildDichromTileResponsive maps measured intrinsic widths to hrefs', () => {
    expect(sources.w160).toEqual({
      href: `${stem}_160.png`,
      w: DICHROM_TILE_INTRINSIC_WIDTHS.w160,
    });
    expect(sources.w640).toEqual({
      href: `${stem}_640.png`,
      w: DICHROM_TILE_INTRINSIC_WIDTHS.w640,
    });
    expect(DICHROM_TILE_INTRINSIC_WIDTHS).toEqual({
      w160: 480,
      w240: 720,
      w320: 880,
      w480: 1200,
      w640: 1440,
    });
  });

  it('dichromTileMobileSrcset lists 160 and 240 tiers', () => {
    expect(dichromTileMobileSrcset(sources)).toBe(
      `${stem}_160.png 480w, ${stem}_240.png 720w`,
    );
  });

  it('dichromTileDesktopSrcset lists 240 through 640 tiers', () => {
    expect(dichromTileDesktopSrcset(sources)).toBe(
      `${stem}_240.png 720w, ${stem}_320.png 880w, ${stem}_480.png 1200w, ${stem}_640.png 1440w`,
    );
  });
});
