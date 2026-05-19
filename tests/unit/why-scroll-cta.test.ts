import { describe, expect, it } from 'vitest';
import {
  ctaOverlapMultiplier,
  type CtaZone,
} from '../../src/scripts/why-scroll-cta';

function domRect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('ctaOverlapMultiplier', () => {
  const zone: CtaZone = { left: 0, right: 100, top: 0, bottom: 100 };

  it('returns 1 when there is no vertical overlap', () => {
    const rect = domRect(0, 200, 50, 50);
    expect(ctaOverlapMultiplier(rect, zone, 1.2, 0.8)).toBe(1);
  });

  it('returns 1 when there is no horizontal overlap', () => {
    const rect = domRect(200, 0, 50, 50);
    expect(ctaOverlapMultiplier(rect, zone, 1.2, 0.8)).toBe(1);
  });

  it('reduces multiplier for partial overlap', () => {
    const rect = domRect(90, 90, 20, 20);
    const m = ctaOverlapMultiplier(rect, zone, 0.5, 0.5);
    expect(m).toBeGreaterThan(0);
    expect(m).toBeLessThan(1);
  });

  it('returns 0 when overlap covers the full rect at full weights', () => {
    const rect = domRect(0, 0, 100, 100);
    expect(ctaOverlapMultiplier(rect, zone, 1, 1)).toBe(0);
  });
});
