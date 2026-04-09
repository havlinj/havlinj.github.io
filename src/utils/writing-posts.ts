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
  return a.data.title.localeCompare(b.data.title, 'en');
}

export function splitAndSortWritingPosts<T extends WritingPostLike>(
  posts: T[],
): {
  featuredPosts: T[];
  regularPosts: T[];
} {
  const sorted = [...posts].sort(compareByDateDescThenTitleAsc);
  const featuredPosts = sorted.filter((post) => Boolean(post.data.featured));
  const regularPosts = sorted.filter((post) => !post.data.featured);
  return { featuredPosts, regularPosts };
}
