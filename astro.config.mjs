// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tina from '@tinacms/astro/integration';
import { tinaAdminDevRedirect } from '@tinacms/astro/vite';
import { wblEditorPlugin } from './scripts/wbl-editor/vite-plugin.mjs';

const editorMode = process.env.WBL_EDITOR_ENABLED === '1';
const site = process.env.SITE_URL || 'https://writingsbylala.com';
const localDev = process.env.DEPLOY_ADAPTER === 'none';

export default defineConfig({
  site,
  output: 'static',
  ...(localDev ? {} : { adapter: cloudflare() }),
  integrations: [tina()],
  trailingSlash: 'ignore',
  vite: {
    ...(editorMode ? { server: { hmr: false } } : {}),
    plugins: [wblEditorPlugin(), tinaAdminDevRedirect()],
    ssr: {
      noExternal: ['@tinacms/astro', '@tinacms/bridge'],
    },
  },
});
