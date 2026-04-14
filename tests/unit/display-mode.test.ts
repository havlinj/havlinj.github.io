import { describe, expect, it } from 'vitest';
import {
  isLikelyLegacyDisplayEnvironment,
  type DisplayEnvironmentSignals,
} from '../../src/utils/display-mode';

function makeSignals(
  overrides: Partial<DisplayEnvironmentSignals> = {},
): DisplayEnvironmentSignals {
  return {
    isStandardRange: true,
    isSrgb: true,
    isWideGamut: false,
    devicePixelRatio: 1,
    colorDepth: 24,
    maxScreenDimension: 1920,
    ...overrides,
  };
}

describe('isLikelyLegacyDisplayEnvironment', () => {
  it('returns true for conservative legacy-like desktop signals', () => {
    expect(isLikelyLegacyDisplayEnvironment(makeSignals())).toBe(true);
  });

  it('returns false for wide-gamut displays', () => {
    expect(
      isLikelyLegacyDisplayEnvironment(makeSignals({ isWideGamut: true })),
    ).toBe(false);
  });

  it('returns false for high-DPI displays', () => {
    expect(
      isLikelyLegacyDisplayEnvironment(makeSignals({ devicePixelRatio: 2 })),
    ).toBe(false);
  });

  it('returns false for large modern panels', () => {
    expect(
      isLikelyLegacyDisplayEnvironment(
        makeSignals({ maxScreenDimension: 2560 }),
      ),
    ).toBe(false);
  });
});
