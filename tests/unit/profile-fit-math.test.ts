import { describe, expect, it } from 'vitest';
import {
  baseWidthFromEffectiveScale,
  fitFontSize,
  normalizePositiveScale,
  roundPx,
} from '../../src/utils/profile-fit-math';

describe('profile-fit-math', () => {
  it('fitFontSize returns min when available is tiny', () => {
    const result = fitFontSize(1, 12, 30, () => 0);
    expect(result).toBe(12);
  });

  it('fitFontSize returns max when it fits cap', () => {
    const result = fitFontSize(200, 12, 30, (fs) => fs * 4);
    expect(result).toBe(30);
  });

  it('fitFontSize binary-searches best size when max does not fit', () => {
    const result = fitFontSize(100, 10, 40, (fs) => fs * 3);
    expect(result).toBeGreaterThan(33);
    expect(result).toBeLessThan(34);
  });

  it('roundPx keeps two decimals', () => {
    expect(roundPx(12.3456)).toBe(12.35);
    expect(roundPx(12.344)).toBe(12.34);
  });

  it('normalizePositiveScale falls back to 1 for invalid values', () => {
    expect(normalizePositiveScale('2')).toBe(2);
    expect(normalizePositiveScale('0')).toBe(1);
    expect(normalizePositiveScale('-3')).toBe(1);
    expect(normalizePositiveScale('NaN')).toBe(1);
  });

  it('baseWidthFromEffectiveScale protects invalid inputs', () => {
    expect(baseWidthFromEffectiveScale(240, 2)).toBe(120);
    expect(baseWidthFromEffectiveScale(240, 0)).toBe(240);
    expect(baseWidthFromEffectiveScale(0, 2)).toBe(0);
  });
});
