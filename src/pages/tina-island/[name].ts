import type { APIRoute } from 'astro';
import { experimental_createIslandRoute } from '@tinacms/astro/experimental';
import { tinaIslands } from '../../lib/tina-islands';

export const prerender = false;
export const ALL: APIRoute = experimental_createIslandRoute(tinaIslands);
