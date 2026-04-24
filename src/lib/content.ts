import { getCollection, type CollectionEntry } from 'astro:content';

type AnyEntry =
  | CollectionEntry<'guides'>
  | CollectionEntry<'stories'>
  | CollectionEntry<'notes'>
  | CollectionEntry<'reflections'>
  | CollectionEntry<'tools'>;

export async function getAllEntries(): Promise<AnyEntry[]> {
  const [guides, stories, notes, reflections, tools] = await Promise.all([
    getCollection('guides'),
    getCollection('stories'),
    getCollection('notes'),
    getCollection('reflections'),
    getCollection('tools'),
  ]);
  const all = [...guides, ...stories, ...notes, ...reflections, ...tools] as AnyEntry[];
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function entryCollectionToType(collection: string): string {
  const map: Record<string, string> = {
    guides: 'guide',
    stories: 'story',
    notes: 'note',
    reflections: 'reflection',
    tools: 'tool',
  };
  return map[collection] ?? collection;
}

export function entryTypeToCollection(type: string): string {
  const map: Record<string, string> = {
    guide: 'guides',
    story: 'stories',
    note: 'notes',
    reflection: 'reflections',
    tool: 'tools',
  };
  return map[type] ?? `${type}s`;
}

export function entryUrl(entry: AnyEntry, base: string): string {
  const type = entryCollectionToType(entry.collection);
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${prefix}/${type}/${entry.id.replace(/\.md$/, '')}/`;
}
