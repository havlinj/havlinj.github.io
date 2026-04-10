import { describe, expect, it } from 'vitest';
import {
  splitAndSortWritingPosts,
  type WritingPostLike,
} from '../../src/utils/writing-posts';

function post(
  id: string,
  title: string,
  isoDate: string,
  featured?: boolean,
): WritingPostLike {
  return {
    id,
    data: {
      title,
      date: new Date(isoDate),
      featured,
    },
  };
}

describe('writing-posts', () => {
  it('sorts by date descending first', () => {
    const items = [
      post('older', 'Older', '2024-01-01'),
      post('newer', 'Newer', '2025-01-01'),
      post('oldest', 'Oldest', '2023-01-01'),
    ];

    const { featuredPosts, regularPosts } = splitAndSortWritingPosts(items);
    expect(featuredPosts).toEqual([]);
    expect(regularPosts.map((p) => p.id)).toEqual(['newer', 'older', 'oldest']);
  });

  it('uses title ASC as tie-breaker for same date', () => {
    const items = [
      post('zeta', 'Zeta Story', '2025-02-01'),
      post('alpha', 'Alpha Story', '2025-02-01'),
      post('middle', 'Middle Story', '2025-02-01'),
    ];

    const { regularPosts } = splitAndSortWritingPosts(items);
    expect(regularPosts.map((p) => p.id)).toEqual(['alpha', 'middle', 'zeta']);
  });

  it('places featured posts in a separate leading group', () => {
    const items = [
      post('a', 'A', '2025-03-01', true),
      post('b', 'B', '2025-04-01'),
      post('c', 'C', '2025-05-01', true),
      post('d', 'D', '2025-06-01'),
    ];

    const { featuredPosts, regularPosts } = splitAndSortWritingPosts(items);
    expect(featuredPosts.map((p) => p.id)).toEqual(['c', 'a']);
    expect(regularPosts.map((p) => p.id)).toEqual(['d', 'b']);
  });

  it('treats missing featured as false', () => {
    const items = [
      post('x', 'X', '2025-01-01'),
      post('y', 'Y', '2025-01-02', false),
    ];
    const { featuredPosts, regularPosts } = splitAndSortWritingPosts(items);
    expect(featuredPosts).toEqual([]);
    expect(regularPosts.map((p) => p.id)).toEqual(['y', 'x']);
  });

  it('dedupes same title and date (e.g. renamed slug + leftover file)', () => {
    const items = [
      post('reflection-on-building-systems', 'Same Title', '2025-06-01'),
      post('system-thinking-applied', 'Same Title', '2025-06-01'),
      post('other', 'Other', '2025-06-01'),
    ];
    const { regularPosts } = splitAndSortWritingPosts(items);
    expect(regularPosts.map((p) => p.id)).toEqual([
      'other',
      'reflection-on-building-systems',
    ]);
  });
});
