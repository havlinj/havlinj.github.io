import { describe, expect, it } from 'vitest';
import { fontPxToMatchBandWidth } from '../../src/utils/hero-tagline-width-fit';

describe('fontPxToMatchBandWidth', () => {
  it('scales font so content width plus padding matches the target band', () => {
    const next = fontPxToMatchBandWidth(10, 200, 150, 20);
    expect(next).toBeCloseTo(10 * (130 / 180));
  });

  it('returns the current font when content or target cannot be measured', () => {
    expect(fontPxToMatchBandWidth(10, 20, 150, 20)).toBe(10);
    expect(fontPxToMatchBandWidth(10, 200, 10, 20)).toBe(10);
    expect(fontPxToMatchBandWidth(0, 200, 150, 20)).toBe(0);
  });
});
