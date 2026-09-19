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
  /** Fixed 1-based Contents positions requested by Lala, keyed by entry id. Unlisted entries keep date order. */
  contentsPositions?: Readonly<Record<string, number>>;
};

export type VolumeResource = {
  title: string;
  action: 'Request' | 'Download' | 'Open guide' | 'Open tool' | 'Open list' | 'Open board';
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
      { title: 'CCA-F Mock Up Exam Guide', action: 'Request' },
      { title: 'Newsletter Workflow', action: 'Request' },
      { title: 'Content-To-Revenue Intelligence System', action: 'Request' },
      { title: 'AI Systems Guide', action: 'Download', href: '/ai-systems-guide/' },
    ],
    contentsPositions: {
      'how-did-i-prepare-for-the-cca-f-exam': 1,
      'what-ai-systems-do-i-use-for-work': 2,
      'how-i-use-my-claude-code-and-codex': 5,
      'what-is-the-folder-system-that-makes-my-ai-engineering-better': 6,
    },
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
      { title: 'Anti-Inflammation Diet Guide', action: 'Request' },
      { title: 'Work Station & Learning Habits Guide', action: 'Request' },
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
      { title: '7 Day Bible Devotional', action: 'Request' },
      { title: 'Send a Prayer Request', action: 'Request' },
    ],
  },
] as const satisfies readonly Volume[];

export function volumeBySlug(slug: string): Volume | undefined {
  return VOLUMES.find((volume) => volume.slug === slug);
}

/**
 * A post's first topic is its editorially selected primary topic. Secondary
 * topics may support discovery and related-post matching, but they must not
 * place the same post in more than one book volume.
 */
export function primaryVolumeForTopics(topics: readonly string[]): Volume | undefined {
  const primaryTopic = topics[0];
  if (!primaryTopic) return undefined;
  return VOLUMES.find((volume) => volume.topics.includes(primaryTopic));
}

export function entryBelongsToVolume(topics: readonly string[], volume: Volume): boolean {
  return primaryVolumeForTopics(topics)?.slug === volume.slug;
}

/** Place entries with a fixed Contents position; every other entry keeps its incoming (date) order. */
export function orderVolumeEntries<T extends { id: string }>(entries: readonly T[], volume: Volume): T[] {
  const positions: Readonly<Record<string, number>> = volume.contentsPositions ?? {};
  const positionOf = (entry: T) => positions[entry.id.replace(/\.md$/, '')];
  const ordered = entries.filter((entry) => positionOf(entry) === undefined);
  const pinned = entries
    .filter((entry) => positionOf(entry) !== undefined)
    .sort((a, b) => positionOf(a) - positionOf(b));
  for (const entry of pinned) {
    ordered.splice(Math.min(positionOf(entry) - 1, ordered.length), 0, entry);
  }
  return ordered;
}
