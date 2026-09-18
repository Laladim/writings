<!-- WBL_OBSIDIAN_SYNC
kind: source-copy
sourcePath: src/pages/index.astro
url: 
WBL_OBSIDIAN_SYNC_END -->
# src/pages/index.astro

This is an Astro source file. Edit text carefully and keep the Astro syntax intact.

```astro
---
import Base from '../layouts/Base.astro';
import { VOLUMES } from '../volumes';
---
<Base
  title="Writings by Lala"
  description="Notes from a life in progress, gathered across work, community, life and faith."
  immersive
>
  <section class="book-stage" data-book-home>
    <div class="book" data-book>
      <div class="book-pages" aria-hidden="true"></div>
      <div class="book-cover" data-book-cover>
        <div class="book-spine" aria-hidden="true"></div>

        <p class="wordmark" aria-label="Writings by Lala">
          <span>Writings</span> by Lala
        </p>

        <div class="title-label">
          <h1>Notes from a life<br />in progress.</h1>
        </div>

        <nav class="cover-volumes" aria-label="Choose a volume by title">
          {VOLUMES.map((volume) => (
            <a
              class="cover-volume-link"
              href={`/${volume.slug}/`}
              data-cover-volume-link={volume.slug}
              style={`--volume-color: ${volume.color}; --volume-ink: ${volume.ink};`}
            >
              <span class="cover-volume-thread" aria-hidden="true"></span>
              <span class="cover-volume-title">{volume.statement}</span>
              <span class="cover-volume-label">({volume.label})</span>
            </a>
          ))}
        </nav>

        <nav class="bookmarks" aria-label="Open a volume">
          {VOLUMES.map((volume) => (
            <a
              class={`bookmark bookmark-${volume.slug}`}
              href={`/${volume.slug}/`}
              data-volume-link={volume.slug}
              style={`--tab-color: ${volume.color}; --tab-ink: ${volume.ink};`}
              aria-label={`${volume.label}: ${volume.statement}`}
            >
              <span>{volume.label}</span>
            </a>
          ))}
        </nav>

        <p class="cover-credit">Written by Shela Marie “Lala” Heramis-Dimalanta</p>
      </div>
    </div>
  </section>
</Base>

<style>
  :global(body.is-immersive) {
    background:
      linear-gradient(90deg, rgba(91, 62, 34, 0.035) 1px, transparent 1px) 0 0 / 5.25rem 100%,
      repeating-linear-gradient(
        2deg,
        transparent 0,
        transparent 2.3rem,
        rgba(96, 68, 39, 0.045) 2.36rem,
        transparent 2.43rem
      ),
      #cdbb9f;
  }

  .book-stage {
    min-height: 100svh;
    display: grid;
    place-items: center;
    padding: max(1rem, env(safe-area-inset-top)) clamp(6.5rem, 11vw, 10rem)
      max(1rem, env(safe-area-inset-bottom)) 1rem;
    overflow: hidden;
    perspective: 1800px;
  }

  .book {
    position: relative;
    width: min(70rem, calc(100vw - clamp(7rem, 14vw, 12rem)), calc((100svh - 2rem) * 1.16));
    aspect-ratio: 1.16 / 1;
    filter: drop-shadow(0 1.4rem 1.5rem rgba(60, 39, 22, 0.2));
    isolation: isolate;
  }

  .book::after {
    content: '';
    position: absolute;
    z-index: -2;
    inset: 1.2% -1.1% -1.1% 1.1%;
    border-radius: 0.65rem 0.35rem 0.45rem 0.7rem;
    background:
      repeating-linear-gradient(180deg, #e6dcc8 0 2px, #f9f2e4 2px 5px),
      #eee5d3;
    box-shadow: 0.3rem 0.45rem 0.5rem rgba(72, 49, 26, 0.2);
  }

  .book-pages {
    position: absolute;
    z-index: 0;
    inset: 0.75% -0.35% -0.2% 0.85%;
    border: 1px solid rgba(112, 88, 58, 0.14);
    border-radius: 0.55rem 0.3rem 0.38rem 0.6rem;
    background: #fbf5e9;
  }

  .book-cover {
    position: absolute;
    z-index: 2;
    inset: 0;
    transform-origin: left center;
    transform-style: preserve-3d;
    border: 1px solid rgba(96, 71, 42, 0.2);
    border-radius: 0.75rem 0.45rem 0.45rem 0.75rem;
    background:
      repeating-linear-gradient(92deg, rgba(103, 80, 49, 0.028) 0 1px, transparent 1px 4px),
      repeating-linear-gradient(2deg, rgba(255, 255, 255, 0.14) 0 1px, transparent 1px 5px),
      #f3ead6;
    box-shadow:
      inset 0 0 3rem rgba(102, 77, 44, 0.055),
      inset -0.6rem 0 1rem rgba(116, 85, 50, 0.055),
      0 0.2rem 0.4rem rgba(72, 49, 26, 0.12);
    will-change: transform, opacity;
  }

  .book-spine {
    position: absolute;
    inset: 0 0 auto 0;
    width: clamp(2.1rem, 4.5vw, 4rem);
    height: 100%;
    border-radius: 0.75rem 0 0 0.75rem;
    background:
      linear-gradient(90deg, rgba(67, 44, 24, 0.13), transparent 30%, rgba(255, 255, 255, 0.22) 63%, rgba(85, 58, 30, 0.08)),
      #eee2cc;
    box-shadow: 0.45rem 0 0.75rem rgba(74, 50, 27, 0.09);
  }

  .wordmark {
    position: absolute;
    z-index: 2;
    top: 5.5%;
    left: 12%;
    margin: 0;
    color: var(--ink);
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: clamp(0.82rem, 0.65rem + 0.6vw, 1.2rem);
    letter-spacing: 0.01em;
  }

  .wordmark span {
    color: var(--accent);
    font-family: 'Caveat', cursive;
    font-size: 1.65em;
    font-weight: 600;
  }

  .title-label {
    position: absolute;
    z-index: 2;
    top: 19%;
    left: 22%;
    width: 56%;
    min-height: 28%;
    display: grid;
    place-items: center;
    padding: clamp(1.2rem, 4vw, 3.2rem);
    border: clamp(0.5rem, 0.9vw, 0.8rem) double #cfc0f3;
    background: #fffdf8;
    box-shadow: 0 0.2rem 0.35rem rgba(82, 57, 34, 0.08);
    text-align: center;
  }

  h1 {
    margin: 0;
    color: var(--ink);
    font-size: clamp(2rem, 2vw + 1rem, 4.25rem);
    font-weight: 600;
    line-height: 1.08;
    letter-spacing: -0.025em;
  }

  .cover-volumes {
    position: absolute;
    z-index: 3;
    top: 51.5%;
    left: 22%;
    width: 56%;
    display: grid;
    border-top: 1px solid rgba(85, 64, 40, 0.2);
  }

  .cover-volume-link {
    display: grid;
    grid-template-columns: 0.34rem minmax(0, 1fr) auto;
    gap: clamp(0.55rem, 1.15vw, 0.9rem);
    align-items: center;
    min-height: clamp(2.75rem, 5.2vh, 3.45rem);
    padding: 0.52rem 0.35rem 0.52rem 0;
    border-bottom: 1px solid rgba(85, 64, 40, 0.2);
    color: var(--ink);
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: clamp(0.82rem, 0.56rem + 0.55vw, 1.12rem);
    line-height: 1.18;
    text-decoration: none;
    transition: background-color 160ms ease, transform 160ms ease;
  }

  .cover-volume-thread {
    align-self: stretch;
    border: 1px solid color-mix(in srgb, var(--volume-ink) 18%, transparent);
    border-radius: 999px;
    background: var(--volume-color);
  }

  .cover-volume-title {
    font-weight: 600;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--volume-ink) 28%, transparent);
    text-decoration-thickness: 1px;
    text-underline-offset: 0.18em;
  }

  .cover-volume-label {
    color: var(--volume-ink);
    font-family: 'Inter', sans-serif;
    font-size: 0.62em;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cover-volume-link:hover {
    transform: translateX(0.16rem);
    background: color-mix(in srgb, var(--volume-color) 16%, transparent);
  }

  .cover-volume-link:hover .cover-volume-title {
    text-decoration-color: var(--volume-ink);
  }

  .cover-volume-link:focus-visible {
    outline: 3px solid var(--volume-ink);
    outline-offset: 3px;
    background: color-mix(in srgb, var(--volume-color) 18%, transparent);
  }

  .cover-volume-link[data-selected='true'] {
    background: color-mix(in srgb, var(--volume-color) 24%, transparent);
    box-shadow: inset 0.28rem 0 var(--volume-ink);
  }

  .bookmarks {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .bookmark {
    --tab-color: #cfc4ec;
    --tab-ink: #403454;
    position: absolute;
    z-index: 1;
    right: clamp(-5.6rem, -7.5vw, -4.2rem);
    width: clamp(4.7rem, 8vw, 6.2rem);
    height: 22%;
    display: grid;
    place-items: center;
    padding: 0.65rem 0.35rem;
    border: 1px solid color-mix(in srgb, var(--tab-ink) 18%, transparent);
    border-left: 0;
    border-radius: 0 0.85rem 0.85rem 0;
    background: var(--tab-color);
    color: var(--tab-ink);
    box-shadow: 0.35rem 0.45rem 0.65rem rgba(67, 45, 25, 0.14);
    font-family: 'Inter', sans-serif;
    font-size: clamp(0.76rem, 0.56rem + 0.45vw, 1rem);
    font-weight: 500;
    letter-spacing: 0.11em;
    text-decoration: none;
    text-transform: uppercase;
    pointer-events: auto;
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .bookmark span {
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }

  .bookmark-work { top: 4%; }
  .bookmark-community { top: 27.5%; }
  .bookmark-life { top: 51%; }
  .bookmark-faith { top: 74.5%; }

  .bookmark:hover {
    transform: translateX(0.28rem);
    text-decoration: none;
    box-shadow: 0.55rem 0.55rem 0.8rem rgba(67, 45, 25, 0.18);
  }

  .bookmark:focus-visible {
    outline: 3px solid var(--ink);
    outline-offset: 4px;
    transform: translateX(0.28rem);
  }

  .bookmark[data-selected='true'] {
    box-shadow: 0 0 0 4px #fffdf8, 0 0 0 7px var(--tab-ink);
  }

  .cover-credit {
    position: absolute;
    z-index: 2;
    right: 8%;
    bottom: 7%;
    left: 12%;
    margin: 0;
    color: var(--ink-soft);
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: clamp(0.72rem, 0.58rem + 0.38vw, 0.96rem);
    line-height: 1.35;
    text-align: center;
  }

  .book[aria-busy='true'] .bookmark,
  .book[aria-busy='true'] .cover-volume-link {
    pointer-events: none;
  }

  .book.is-opening .book-cover {
    animation: turn-cover 680ms cubic-bezier(0.7, 0, 0.22, 1) forwards;
  }

  @keyframes turn-cover {
    0% { transform: rotateY(0); opacity: 1; }
    48% { transform: rotateY(-34deg) translateX(-1.5%); opacity: 0.92; }
    100% { transform: rotateY(-86deg) translateX(-4%); opacity: 0.25; }
  }

  @media (max-width: 680px) {
    .book-stage {
      padding-right: 4.35rem;
      padding-left: 0.75rem;
    }

    .book {
      width: min(calc(100vw - 4.7rem), 23rem, calc((100svh - 2rem) * 0.72));
      aspect-ratio: 0.72 / 1;
    }

    .book::after {
      inset: 0.8% -1.8% -0.8% 1.4%;
    }

    .book-spine {
      width: 2rem;
    }

    .wordmark {
      top: 5%;
      left: 13%;
      font-size: 0.74rem;
    }

    .title-label {
      top: 14%;
      left: 13%;
      width: 74%;
      min-height: 23%;
      padding: 0.9rem 0.75rem;
      border-width: 0.48rem;
    }

    h1 {
      font-size: clamp(1.4rem, 6.7vw, 2rem);
    }

    .cover-volumes {
      top: 43%;
      left: 13%;
      width: 74%;
    }

    .cover-volume-link {
      grid-template-columns: 0.24rem minmax(0, 1fr);
      gap: 0.42rem;
      min-height: 0;
      padding: 0.36rem 0.12rem 0.36rem 0;
      font-size: clamp(0.64rem, 2.7vw, 0.76rem);
      line-height: 1.15;
    }

    .cover-volume-thread {
      grid-row: 1 / span 2;
    }

    .cover-volume-label {
      grid-column: 2;
      margin-top: -0.18rem;
      font-size: 0.58em;
    }

    .bookmark {
      right: -4rem;
      width: 4.15rem;
      font-size: 0.68rem;
      letter-spacing: 0.08em;
    }

    .cover-credit {
      right: 7%;
      bottom: 4%;
      left: 11%;
      font-size: 0.68rem;
      line-height: 1.3;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bookmark,
    .cover-volume-link {
      transition: none;
    }

    .book.is-opening .book-cover {
      animation: none;
    }
  }
</style>

<script>
  const book = document.querySelector<HTMLElement>('[data-book]');
  const cover = document.querySelector<HTMLElement>('[data-book-cover]');
  const volumeLinks = document.querySelectorAll<HTMLAnchorElement>('[data-volume-link], [data-cover-volume-link]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let opening = false;

  const resetBook = () => {
    opening = false;
    book?.classList.remove('is-opening');
    book?.removeAttribute('aria-busy');
    volumeLinks.forEach((link) => delete link.dataset.selected);
  };

  window.addEventListener('pageshow', resetBook);

  const isPlainPrimaryClick = (event: MouseEvent, link: HTMLAnchorElement) => (
    event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey
    && !event.defaultPrevented
    && !link.target
    && !link.hasAttribute('download')
  );

  volumeLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!book || !cover || opening || reduceMotion.matches || !isPlainPrimaryClick(event, link)) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      event.preventDefault();
      opening = true;
      link.dataset.selected = 'true';
      book.classList.add('is-opening');
      book.setAttribute('aria-busy', 'true');

      let navigated = false;
      const navigate = () => {
        if (navigated) return;
        navigated = true;
        window.location.assign(destination.href);
      };

      cover.addEventListener('animationend', navigate, { once: true });
      window.setTimeout(navigate, 850);
    });
  });
</script>
```
