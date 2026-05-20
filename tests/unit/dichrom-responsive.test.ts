import { describe, expect, it } from 'vitest';
import {
  buildDichromResponsive,
  dichromDesktopSrcset,
  dichromMobileSrcset,
  DICHROM_INTRINSIC_WIDTHS,
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
      `${stem}_720.png 1620w, ${stem}_1080.png 2160w`,
    );
  });

  it('dichromDesktopSrcset lists 1080 through 2400 tiers', () => {
    expect(dichromDesktopSrcset(sources)).toBe(
      `${stem}_1080.png 2160w, ${stem}_1440.png 2736w, ${stem}_1920.png 3360w, ${stem}_2400.png 3840w`,
    );
  });
});
