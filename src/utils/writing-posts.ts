export type WritingPostLike = {
  id: string;
  data: {
    title: string;
    date: Date;
    featured?: boolean;
  };
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

export function splitAndSortWritingPosts<T extends WritingPostLike>(
  posts: T[],
): {
  featuredPosts: T[];
  regularPosts: T[];
} {
  const sorted = dedupeByTitleAndDate(
    [...posts].sort(compareByDateDescThenTitleAsc),
  );
  const featuredPosts = sorted.filter((post) => Boolean(post.data.featured));
  const featuredIds = new Set(featuredPosts.map((p) => p.id));
  const regularPosts = sorted.filter(
    (post) => !Boolean(post.data.featured) && !featuredIds.has(post.id),
  );
  return { featuredPosts, regularPosts };
}
