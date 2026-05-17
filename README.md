# writings

A content library for Lala. Lives at `laladim.github.io/writings/`.

Built with Astro. Content is markdown in `src/content/{notes,stories,guides,reflections,tools}/`. Push to `main`, auto-deploys via GitHub Actions.

## Local dev

```bash
npm install
npm run dev       # http://localhost:4321/writings/
npm run build     # static output to ./dist
npm run preview
```

## Adding an entry

1. Create a markdown file in `src/content/<type>/<slug>.md`
2. Add frontmatter (title, type, topics[], date, description)
3. Git push — the site rebuilds in ~60 seconds

Types: `note` · `story` · `guide` · `reflection` · `tool`.
Topics live in `src/topics.ts` (15 options).

## Image uploads

Before publishing new local images in `public/`, run:

```bash
npm run images:optimize
npm run images:audit
```

Use the generated `.webp` asset in content frontmatter and HTML. The audit fails when a raster image is larger than 250 KB, which keeps the site fast as new images are added.

## Architecture

See plan: `cobalt-skills/shela-personal-website.md` in the Life-Dashboard repo.
