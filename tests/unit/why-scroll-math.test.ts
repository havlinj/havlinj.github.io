import { describe, expect, it } from 'vitest';
import {
  clamp,
  middlePhaseRevolverGate,
  revolverLerpForDelta,
  smoothstep,
  wheelDeltaToPixels,
} from '../../src/utils/why-scroll-math';

describe('why-scroll-math', () => {
  it('clamp keeps values inside bounds', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(7, 0, 10)).toBe(7);
  });

  it('smoothstep has expected edge and midpoint values', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 6);
  });

  it('wheel delta conversion supports pixel/line/page modes', () => {
    expect(wheelDeltaToPixels(100, 0, 0, 500)).toBe(100);
    expect(wheelDeltaToPixels(3, 0, 1, 500)).toBe(48);
    expect(wheelDeltaToPixels(1, 0, 2, 500)).toBe(500);
  });

  it('middle phase gate is zero when no scroll range exists', () => {
    expect(middlePhaseRevolverGate(0, 0, 500, 100, 0.22, 70, 0.22)).toBe(0);
  });

  it('middle phase gate peaks in the middle and drops near edges', () => {
    const start = middlePhaseRevolverGate(0, 1000, 500, 100, 0.22, 70, 0.22);
    const middle = middlePhaseRevolverGate(500, 1000, 500, 100, 0.22, 70, 0.22);
    const end = middlePhaseRevolverGate(980, 1000, 500, 100, 0.22, 70, 0.22);
    expect(start).toBe(0);
    expect(middle).toBeGreaterThan(0.99);
    expect(end).toBeLessThan(0.2);
  });

  it('revolver lerp snaps for tiny deltas and eases otherwise', () => {
    expect(revolverLerpForDelta(1, 2.5, 0.94)).toBe(1);
    const lerp = revolverLerpForDelta(60, 2.5, 0.94);
    expect(lerp).toBeGreaterThan(0.2);
    expect(lerp).toBeLessThan(0.35);
  });
});
