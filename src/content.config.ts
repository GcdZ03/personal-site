import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    tier: z.enum(['flagship', 'standard', 'archive']),
    stack: z.array(z.string()).min(1),
    role: z.string(),
    period: z.string(),
    links: z
      .object({
        repo: z.string().url().optional(),
        download: z.string().url().optional(),
        demo: z.string().url().optional(),
      })
      .default({}),
    order: z.number().int(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, posts };
