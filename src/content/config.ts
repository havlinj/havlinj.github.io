import { z, defineCollection } from 'astro:content';

export const collections = {
  pages: defineCollection({
    schema: z.object({
      title: z.string(),
      // description: z.string().optional(),
      // image: z.string().optional()
    }),
  }),

  blog: defineCollection({
    schema: z.object({
      title: z.string(),
      date: z.date(),
      // description: z.string().optional(),
      // image: z.string().optional()
    }),
  }),
};
