import { requestWithMetadata } from '@tinacms/astro/data';
import client from '../../tina/__generated__/client';

export const getCanary = () =>
  requestWithMetadata(
    client.queries.canary({ relativePath: 'tinacms-canary.md' }),
    { priority: 'primary' },
  );

export type CmsCanary = Awaited<ReturnType<typeof getCanary>>['data']['canary'];
