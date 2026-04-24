export type Topic = {
  slug: string;
  name: string;
  description: string;
  group: 'professional' | 'life';
};

export const TOPICS: Topic[] = [
  { slug: 'ai-content-systems', name: 'AI Content Systems', description: 'Building AI-powered content workflows, prompt systems, production pipelines.', group: 'professional' },
  { slug: 'prompt-engineering', name: 'Prompt Engineering', description: 'What makes prompts work. Patterns, failures, templates.', group: 'professional' },
  { slug: 'automation', name: 'Automation & Workflows', description: 'Pipelines, Make.com, GitHub Actions, zero-cost automations.', group: 'professional' },
  { slug: 'content-strategy', name: 'Content Strategy & SEO', description: 'Planning, structure, Hub & Constellation, keyword strategy.', group: 'professional' },
  { slug: 'data-architecture', name: 'Data Architecture', description: 'Organizing information into queryable, useful systems.', group: 'professional' },
  { slug: 'freelancing', name: 'Freelancing & Remote Work', description: 'Building a career from home, earning, growing.', group: 'professional' },
  { slug: 'newsletter-craft', name: 'Newsletter Craft', description: 'Lessons from 307+ editions of Beyond Banks.', group: 'professional' },
  { slug: 'b2b-saas', name: 'B2B SaaS Marketing', description: 'Marketing to technical buyers in fintech.', group: 'professional' },
  { slug: 'faith-theology', name: 'Faith & Theology', description: 'Walking with God through work, suffering, everyday life.', group: 'life' },
  { slug: 'health', name: 'Health & Chronic Illness', description: 'Living with endo and rare disease, perseverance stories.', group: 'life' },
  { slug: 'filipino-professionals', name: 'Filipino Professionals', description: 'Stories and resources for Filipino global workers.', group: 'life' },
  { slug: 'community', name: 'Community Building', description: 'Lessons from leading 30,000+ members.', group: 'life' },
  { slug: 'marriage-family', name: 'Marriage & Family', description: 'Life with AJ, raising Herald, real family stories.', group: 'life' },
  { slug: 'learning-in-public', name: 'Learning in Public', description: 'Documenting the journey, sharing the process.', group: 'life' },
  { slug: 'workstation-setup', name: 'My Workstation & Tools', description: 'Physical and digital workspace evolution.', group: 'life' },
];

export const TYPES = [
  { slug: 'guide', label: 'Guides', description: 'Step-by-step, tactical, generous.' },
  { slug: 'story', label: 'Stories', description: 'Personal narratives, faith, health, career.' },
  { slug: 'note', label: 'Field Notes', description: 'Quick lessons, mistakes, observations.' },
  { slug: 'reflection', label: 'Reflections', description: 'Devotionals, BSF insights, Scripture applied.' },
  { slug: 'tool', label: 'Tools', description: 'Apps, downloads, templates.' },
] as const;

export function topicBySlug(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}
