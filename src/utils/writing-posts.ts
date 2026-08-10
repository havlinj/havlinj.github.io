export type WritingCategory = 'technical' | 'conceptual';

export type WritingPostLike = {
  id: string;
  data: {
    title: string;
    date: Date;
    featured?: boolean;
    category: WritingCategory;
  };
};

export type WritingCategoryGroup<T> = {
  featuredPosts: T[];
  regularPosts: T[];
};

function compareByDateDescThenTitleAsc(
  a: WritingPostLike,
  b: WritingPostLike,
): number {
  const byDate = b.data.date.valueOf() - a.data.date.valueOf();
  if (byDate !== 0) return byDate;
  const byTitle = a.data.title.localeCompare(b.data.title, 'en');
  if (byTitle !== 0) return byTitle;
  return a.id.localeCompare(b.id, 'en');
}

/** One entry per (title, date) — avoids duplicate rows after renames (two .md for one article). */
function dedupeByTitleAndDate<T extends WritingPostLike>(posts: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const post of posts) {
    const k = `${post.data.title}\0${post.data.date.valueOf()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(post);
  }
  return out;
}

function splitFeatured<T extends WritingPostLike>(
  posts: T[],
): WritingCategoryGroup<T> {
  const featuredPosts = posts.filter((post) => Boolean(post.data.featured));
  const featuredIds = new Set(featuredPosts.map((p) => p.id));
  const regularPosts = posts.filter((post) => !featuredIds.has(post.id));
  return { featuredPosts, regularPosts };
}

/** Writing index: posts split into Rigor / Freestyle sections, each with its own featured/regular sub-group. */
export function splitAndSortWritingPosts<T extends WritingPostLike>(
  posts: T[],
): {
  technical: WritingCategoryGroup<T>;
  conceptual: WritingCategoryGroup<T>;
} {
  const sorted = dedupeByTitleAndDate(
    [...posts].sort(compareByDateDescThenTitleAsc),
  );
  return {
    technical: splitFeatured(
      sorted.filter((post) => post.data.category === 'technical'),
    ),
    conceptual: splitFeatured(
      sorted.filter((post) => post.data.category === 'conceptual'),
    ),
  };
}

export function formatWritingListDate(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}
