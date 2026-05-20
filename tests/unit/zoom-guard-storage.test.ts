import { describe, expect, it } from 'vitest';
import {
  hasValidZoomFreezeBaseline,
  parseZoomFreezeBaselineJson,
  parseZoomGuardStateJson,
} from '../../src/utils/zoom-guard-storage';

describe('zoom-guard-storage', () => {
  it('parseZoomFreezeBaselineJson accepts valid JSON', () => {
    const raw = JSON.stringify({ dpr: 2, vvScale: 1, innerWidth: 800 });
    expect(parseZoomFreezeBaselineJson(raw)).toEqual({
      dpr: 2,
      vvScale: 1,
      innerWidth: 800,
    });
  });

  it('parseZoomFreezeBaselineJson rejects invalid or malformed', () => {
    expect(parseZoomFreezeBaselineJson(null)).toBeNull();
    expect(parseZoomFreezeBaselineJson('not json')).toBeNull();
    expect(parseZoomFreezeBaselineJson('{}')).toBeNull();
    expect(
      parseZoomFreezeBaselineJson(
        JSON.stringify({ dpr: 1, vvScale: 1, innerWidth: -1 }),
      ),
    ).toBeNull();
  });

  it('hasValidZoomFreezeBaseline mirrors init guard', () => {
    expect(hasValidZoomFreezeBaseline(null)).toBe(false);
    expect(
      hasValidZoomFreezeBaseline({ dpr: 1, vvScale: 1, innerWidth: 400 }),
    ).toBe(true);
  });

  it('parseZoomGuardStateJson reads partial payloads', () => {
    expect(parseZoomGuardStateJson(null)).toBeNull();
    expect(
      parseZoomGuardStateJson(
        JSON.stringify({ active: true, freezeScale: 1.05 }),
      ),
    ).toEqual({ active: true, freezeScale: 1.05 });
    expect(parseZoomGuardStateJson(JSON.stringify({ active: true }))).toEqual({
      active: true,
    });
    expect(
      parseZoomGuardStateJson(JSON.stringify({ freezeScale: 0.9 })),
    ).toEqual({ freezeScale: 0.9 });
    expect(parseZoomGuardStateJson(JSON.stringify({}))).toEqual({});
  });

  it('parseZoomGuardStateJson ignores invalid freezeScale', () => {
    expect(
      parseZoomGuardStateJson(
        JSON.stringify({ active: true, freezeScale: 'nope' }),
      ),
    ).toEqual({ active: true });
  });
});
