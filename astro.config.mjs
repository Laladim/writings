// @ts-check
import { defineConfig } from 'astro/config';
import { wblEditorPlugin } from './scripts/wbl-editor/vite-plugin.mjs';

const editorMode = process.env.WBL_EDITOR_ENABLED === '1';

export default defineConfig({
  site: 'https://writingsbylala.com',
  trailingSlash: 'ignore',
  vite: {
    ...(editorMode ? { server: { hmr: false } } : {}),
    plugins: [wblEditorPlugin()],
  },
});
