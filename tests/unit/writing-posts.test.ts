import { describe, expect, it } from 'vitest';
import {
  formatWritingListDate,
  splitAndSortWritingPosts,
  type WritingCategory,
  type WritingPostLike,
} from '../../src/utils/writing-posts';

function post(
  id: string,
  title: string,
  isoDate: string,
  category: WritingCategory,
  featured?: boolean,
): WritingPostLike {
  return {
    id,
    data: {
      title,
      date: new Date(isoDate),
      category,
      featured,
    },
  };
}

describe('splitAndSortWritingPosts', () => {
  it('sorts by date descending first, within each category', () => {
    const items = [
      post('older', 'Older', '2024-01-01', 'conceptual'),
      post('newer', 'Newer', '2025-01-01', 'conceptual'),
      post('oldest', 'Oldest', '2023-01-01', 'conceptual'),
    ];

    const { conceptual } = splitAndSortWritingPosts(items);
    expect(conceptual.featuredPosts).toEqual([]);
    expect(conceptual.regularPosts.map((p) => p.id)).toEqual([
      'newer',
      'older',
      'oldest',
    ]);
  });

  it('uses title ASC as tie-breaker for same date', () => {
    const items = [
      post('zeta', 'Zeta Story', '2025-02-01', 'technical'),
      post('alpha', 'Alpha Story', '2025-02-01', 'technical'),
      post('middle', 'Middle Story', '2025-02-01', 'technical'),
    ];

    const { technical } = splitAndSortWritingPosts(items);
    expect(technical.regularPosts.map((p) => p.id)).toEqual([
      'alpha',
      'middle',
      'zeta',
    ]);
  });

  it('splits posts into technical and conceptual sections', () => {
    const items = [
      post('a', 'A', '2025-03-01', 'technical'),
      post('b', 'B', '2025-04-01', 'conceptual'),
      post('c', 'C', '2025-05-01', 'technical'),
      post('d', 'D', '2025-06-01', 'conceptual'),
    ];

    const { technical, conceptual } = splitAndSortWritingPosts(items);
    expect(technical.regularPosts.map((p) => p.id)).toEqual(['c', 'a']);
    expect(conceptual.regularPosts.map((p) => p.id)).toEqual(['d', 'b']);
  });

  it('places featured posts in a separate leading group within their category', () => {
    const items = [
      post('a', 'A', '2025-03-01', 'conceptual', true),
      post('b', 'B', '2025-04-01', 'conceptual'),
      post('c', 'C', '2025-05-01', 'conceptual', true),
      post('d', 'D', '2025-06-01', 'conceptual'),
    ];

    const { conceptual } = splitAndSortWritingPosts(items);
    expect(conceptual.featuredPosts.map((p) => p.id)).toEqual(['c', 'a']);
    expect(conceptual.regularPosts.map((p) => p.id)).toEqual(['d', 'b']);
  });

  it('treats missing featured as false', () => {
    const items = [
      post('x', 'X', '2025-01-01', 'technical'),
      post('y', 'Y', '2025-01-02', 'technical', false),
    ];
    const { technical } = splitAndSortWritingPosts(items);
    expect(technical.featuredPosts).toEqual([]);
    expect(technical.regularPosts.map((p) => p.id)).toEqual(['y', 'x']);
  });

  it('dedupes same title and date; tie-break by id ASC keeps the first slug', () => {
    const items = [
      post(
        'reflection-on-building-systems',
        'Same Title',
        '2025-06-01',
        'conceptual',
      ),
      post('system-thinking-applied', 'Same Title', '2025-06-01', 'conceptual'),
      post('other', 'Other', '2025-06-01', 'conceptual'),
    ];
    const { conceptual } = splitAndSortWritingPosts(items);
    expect(conceptual.regularPosts.map((p) => p.id)).toEqual([
      'other',
      'reflection-on-building-systems',
    ]);
  });

  it('returns an empty group for a category with no posts', () => {
    const items = [post('a', 'A', '2025-01-01', 'conceptual')];
    const { technical } = splitAndSortWritingPosts(items);
    expect(technical.featuredPosts).toEqual([]);
    expect(technical.regularPosts).toEqual([]);
  });
});

describe('formatWritingListDate', () => {
  it('formats as zero-padded YY.MM.DD', () => {
    /* Local-time constructor (year, monthIndex, day) — avoids a UTC/local
       day-shift that an ISO date-only string would introduce depending on
       the test runner's timezone, since the function reads local fields. */
    expect(formatWritingListDate(new Date(2026, 2, 3))).toBe('26.03.03');
    expect(formatWritingListDate(new Date(2026, 3, 10))).toBe('26.04.10');
  });
});
