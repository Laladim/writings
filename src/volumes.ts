export type Volume = {
  slug: 'work' | 'community' | 'life' | 'faith';
  label: string;
  roman: 'I' | 'II' | 'III' | 'IV';
  statement: string;
  note: string;
  topics: readonly string[];
  color: string;
  ink: string;
  resources: readonly VolumeResource[];
};

export type VolumeResource = {
  title: string;
  action: 'Download' | 'Open guide' | 'Open tool' | 'Open list' | 'Open board';
  href?: string;
};

export const VOLUMES = [
  {
    slug: 'work',
    label: 'Work',
    roman: 'I',
    statement: 'Building AI Systems for Content Marketing',
    note: 'Systems, craft and the work behind useful content.',
    topics: [
      'ai-content-systems',
      'prompt-engineering',
      'automation',
      'content-strategy',
      'data-architecture',
      'newsletter-craft',
      'b2b-saas',
    ],
    color: '#efc0a6',
    ink: '#513428',
    resources: [
      { title: 'CCA-F Mock Up Exam Guide', action: 'Download' },
      { title: 'Newsletter Workflow', action: 'Download' },
      { title: 'Content-To-Revenue Intelligence System', action: 'Download' },
    ],
  },
  {
    slug: 'community',
    label: 'Community',
    roman: 'II',
    statement: 'Building AI Systems for Freelancers',
    note: 'Shared lessons, beginner paths and Filipino freelancer stories.',
    topics: ['freelancing', 'bff-stories', 'filipino-professionals', 'community'],
    color: '#cfc4ec',
    ink: '#403454',
    resources: [
      {
        title: 'Freelancing Blueprint',
        action: 'Open guide',
        href: '/bonafide-filipino-freelancers/blueprint/',
      },
      {
        title: 'VA Resume Converter',
        action: 'Open tool',
        href: '/bonafide-filipino-freelancers/va-resume-converter/',
      },
      {
        title: '100+ Remote Job Platforms',
        action: 'Open list',
        href: '/guide/remote-job-sites-for-filipinos/',
      },
      {
        title: 'VA Job Board',
        action: 'Open board',
        href: '/bonafide-filipino-freelancers/jobs/',
      },
    ],
  },
  {
    slug: 'life',
    label: 'Life',
    roman: 'III',
    statement: 'Battling Blood Cancer & Chronic Diseases',
    note: 'Illness, family and the ordinary days worth remembering.',
    topics: ['health', 'marriage-family', 'learning-in-public', 'workstation-setup'],
    color: '#b9d3e2',
    ink: '#28414e',
    resources: [
      { title: 'Anti-Inflammation Diet Guide', action: 'Download' },
      { title: 'Work Station & Learning Habits Guide', action: 'Download' },
    ],
  },
  {
    slug: 'faith',
    label: 'Faith',
    roman: 'IV',
    statement: 'Believing God & Making Sense of Life',
    note: 'Questions, conviction and the hope beneath ordinary life.',
    topics: ['faith-theology'],
    color: '#cad9b6',
    ink: '#354429',
    resources: [
      { title: '7 Day Bible Devotional', action: 'Download' },
      { title: 'Send a Prayer Request', action: 'Download' },
    ],
  },
] as const satisfies readonly Volume[];

export function volumeBySlug(slug: string): Volume | undefined {
  return VOLUMES.find((volume) => volume.slug === slug);
}

export function entryBelongsToVolume(topics: readonly string[], volume: Volume): boolean {
  return topics.some((topic) => volume.topics.includes(topic));
}
