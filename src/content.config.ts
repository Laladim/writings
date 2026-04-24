import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const contentSchema = z.object({
  title: z.string(),
  type: z.enum(['guide', 'story', 'note', 'reflection', 'tool', 'watch']),
  topics: z.array(z.string()).min(1).max(3),
  date: z.coerce.date(),
  description: z.string(),
  related: z.array(z.string()).optional(),
  image: z.string().optional(),
  featured: z.boolean().optional(),
  linkedinFirst: z.boolean().optional(),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: contentSchema,
});
const stories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stories' }),
  schema: contentSchema,
});
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: contentSchema,
});
const reflections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reflections' }),
  schema: contentSchema,
});
const tools = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tools' }),
  schema: contentSchema,
});

export const collections = { guides, stories, notes, reflections, tools };
