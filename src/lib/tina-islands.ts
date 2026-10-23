import type { IslandRegistry } from '@tinacms/astro/experimental';
import CanaryArticle from '../components/tina/CanaryArticle.astro';
import { getCanary } from './tina-canary';

export const tinaIslands: IslandRegistry = {
  canary: {
    fetch: () => getCanary(),
    component: CanaryArticle,
    wrapper: { tag: 'article' },
    propsFromData: (result) => ({
      data: (result as Awaited<ReturnType<typeof getCanary>>).data?.canary,
    }),
  },
};
