import { defineConfig } from 'tinacms';

const branch =
  process.env.GITHUB_BRANCH ||
  process.env.WORKERS_CI_BRANCH ||
  process.env.CF_PAGES_BRANCH ||
  'codex/tina-cms-canary';

export default defineConfig({
  branch,
  clientId: process.env.PUBLIC_TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: '',
      publicFolder: 'public',
    },
  },
  schema: {
    collections: [
      {
        name: 'canary',
        label: 'WBL TinaCMS Canary',
        path: 'src/content/guides',
        format: 'md',
        match: {
          include: 'tinacms-canary',
        },
        ui: {
          router: () => '/tinacms-canary/',
          allowedActions: {
            create: false,
            delete: false,
            createNestedFolder: false,
          },
        },
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'type',
            label: 'Content type',
            required: true,
            options: [{ label: 'Guide', value: 'guide' }],
          },
          {
            type: 'string',
            name: 'topics',
            label: 'Topics',
            list: true,
            required: true,
          },
          {
            type: 'datetime',
            name: 'date',
            label: 'Date',
            required: true,
          },
          {
            type: 'datetime',
            name: 'modified',
            label: 'Modified date',
          },
          {
            type: 'string',
            name: 'description',
            label: 'Description',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'image',
            label: 'External image URL',
          },
          {
            type: 'boolean',
            name: 'featured',
            label: 'Featured',
          },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Page text',
            isBody: true,
          },
        ],
      },
    ],
  },
});
