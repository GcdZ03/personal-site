import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z
    .object({
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
    })
    .superRefine((data, ctx) => {
      if (
        data.tier === 'standard' &&
        !data.links.repo &&
        !data.links.download &&
        !data.links.demo
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['links'],
          message:
            'A standard-tier project needs at least one of links.repo, links.download, or links.demo. A project with nothing to link to probably belongs in tier: archive instead.',
        });
      }
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
