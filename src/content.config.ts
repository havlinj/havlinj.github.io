import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
  }),
});

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    featured: z.boolean().optional().default(false),
    /* Required, no default: a post with a missing/invalid category fails the
       content collection build instead of silently rendering in the wrong
       (or no) Writing section. */
    category: z.enum(['technical', 'conceptual']),
  }),
});

export const collections = { pages, blog };
