import { describe, expect, it } from 'vitest';
import {
  FALLBACK_WRITING_POOL_OPACITY,
  getWritingPoolStep,
  readNonNegativeInt,
  resolveWritingPoolEntry,
  toPanelBgPosition,
  type WritingPoolEntry,
} from '../../src/utils/writing-pool';

describe('writing-pool', () => {
  it('parses non-negative integer index from storage value', () => {
    expect(readNonNegativeInt('5')).toBe(5);
    expect(readNonNegativeInt('-10')).toBe(0);
    expect(readNonNegativeInt('not-a-number')).toBe(0);
    expect(readNonNegativeInt(null)).toBe(0);
  });

  it('resolves a valid entry tuple', () => {
    const entry: WritingPoolEntry = ['/pool/a.png', 0.9, 12, -8];
    expect(resolveWritingPoolEntry(entry)).toEqual({
      url: '/pool/a.png',
      opacity: 0.9,
      nudgeX: 12,
      nudgeY: -8,
    });
  });

  it('falls back for invalid numeric fields', () => {
    const malformed = ['/pool/a.png', 'bad-opacity', 'bad-x', undefined];
    expect(resolveWritingPoolEntry(malformed)).toEqual({
      url: '/pool/a.png',
      opacity: FALLBACK_WRITING_POOL_OPACITY,
      nudgeX: 0,
      nudgeY: 0,
    });
  });

  it('returns null for invalid entries', () => {
    expect(resolveWritingPoolEntry(null)).toBeNull();
    expect(resolveWritingPoolEntry(['', 0.9, 0, 0])).toBeNull();
    expect(resolveWritingPoolEntry(['/pool/a.png', 0.9, 0])).toBeNull();
  });

  it('steps through pool entries and wraps to start', () => {
    const entries: WritingPoolEntry[] = [
      ['/pool/first.png', 1, 0, 0],
      ['/pool/second.png', 0.8, 5, -3],
      ['/pool/third.png', 0.7, -10, 4],
    ];

    const first = getWritingPoolStep(entries, '0');
    const second = getWritingPoolStep(entries, '1');
    const wrapped = getWritingPoolStep(entries, '5');

    expect(first).toEqual({
      currentIndex: 0,
      nextIndex: 1,
      entry: { url: '/pool/first.png', opacity: 1, nudgeX: 0, nudgeY: 0 },
    });
    expect(second).toEqual({
      currentIndex: 1,
      nextIndex: 2,
      entry: { url: '/pool/second.png', opacity: 0.8, nudgeX: 5, nudgeY: -3 },
    });
    expect(wrapped).toEqual({
      currentIndex: 2,
      nextIndex: 0,
      entry: { url: '/pool/third.png', opacity: 0.7, nudgeX: -10, nudgeY: 4 },
    });
  });

  it('returns null when step points to malformed config', () => {
    const entries = [['/pool/ok.png', 1, 0, 0], ['broken']] as unknown[];
    expect(getWritingPoolStep(entries, '1')).toBeNull();
  });

  it('formats pixel nudge as centered calc expression', () => {
    expect(toPanelBgPosition(0)).toBe('calc(50% + 0px)');
    expect(toPanelBgPosition(-12)).toBe('calc(50% + -12px)');
    expect(toPanelBgPosition(18.5)).toBe('calc(50% + 18.5px)');
  });
});
