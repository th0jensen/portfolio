import { build_client, http } from '@qubit-rs/client';
import { error, loader } from '@ilha/router';

import { pageRouter, registry } from '../.ilha/pages.server.ts';
import type {
  Data,
  ExperienceItem,
  QubitServer,
  RenderInput,
  RenderOutput,
} from './bindings/index.ts';
import footer from './islands/footer.tsx';
import header from './islands/header.tsx';

async function attachLoaders(input: RenderInput): Promise<{
  data: Data;
  experience: ExperienceItem[];
}> {
  const api = build_client<QubitServer>(http(`${input.rpc_origin}/rpc`));
  const pathname = new URL(input.url, 'http://renderer').pathname;
  const dataPromise = api.data.query();
  const experiencePromise = pathname === '/' || pathname === '/experience'
    ? api.experience.query()
    : Promise.resolve([]);

  const [data, experience] = await Promise.all([
    dataPromise,
    experiencePromise,
  ]);

  pageRouter.attachLoader(
    '/',
    loader(() => ({
      data: {
        about: data.about,
        projects: data.projects,
        en: pick(data.en, 'nav', 'hero', 'buttons', 'work'),
        no: pick(data.no, 'nav', 'hero', 'buttons', 'work'),
      },
      experience,
    })),
  );
  pageRouter.attachLoader(
    '/projects',
    loader(() => ({
      data: {
        projects: data.projects,
        en: pick(data.en, 'nav', 'work'),
        no: pick(data.no, 'nav', 'work'),
      },
    })),
  );
  pageRouter.attachLoader(
    '/projects/:slug',
    loader(({ params }) => {
      const project = data.projects.find((project) => project.slug === params.slug);
      if (!project) error(404, 'Project not found');

      return {
        data: {
          project,
          projects: data.projects,
          en: pick(data.en, 'nav', 'work'),
          no: pick(data.no, 'nav', 'work'),
        },
      };
    }),
  );
  pageRouter.attachLoader(
    '/experience',
    loader(() => ({
      data: {
        en: pick(data.en, 'nav', 'experience'),
        no: pick(data.no, 'nav', 'experience'),
      },
      experience,
    })),
  );
  pageRouter.attachLoader(
    '/contact',
    loader(() => ({
      data: {
        en: pick(data.en, 'nav', 'contact'),
        no: pick(data.no, 'nav', 'contact'),
      },
    })),
  );

  return { data, experience };
}

export async function render(input: RenderInput): Promise<RenderOutput> {
  const { data } = await attachLoaders(input);

  const result = await pageRouter.renderResponse(input.url, registry, {
    snapshot: false,
  });

  if (result.kind === 'redirect') {
    return {
      id: input.id,
      status: result.status,
      html: '',
      error: null,
      headers: { location: result.to },
    };
  }

  const headerHtml = await header.hydratable(
    {
      data: {
        locales: data.locales,
        en: pickHeaderCopy(data.en),
        no: pickHeaderCopy(data.no),
      },
      path: new URL(input.url, 'http://renderer').pathname,
    },
    { name: 'header', as: 'div' },
  );

  const footerHtml = await footer.hydratable({}, { name: 'footer', as: 'div' });

  const body =
    `<main class="site-layout">${headerHtml}<div class="site-page-content"><div id="app" style="flex: 1">${result.html}</div>${footerHtml}</div></main>`;
  const html = documentShell(body, data, input.assets, input.head);

  return {
    id: input.id,
    status: result.kind === 'error' ? result.status : (result.status ?? 200),
    html,
    error: null,
    headers: {},
  };
}

function pickHeaderCopy(locale: Data['en']) {
  const { nav, buttons, theme } = locale;
  return { nav, buttons: { resume: buttons.resume }, theme };
}

function pick<T, K extends keyof T>(source: T, ...keys: K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<
    T,
    K
  >;
}

function documentShell(
  body: string,
  data: Data,
  assets: RenderInput['assets'],
  head: RenderInput['head'],
): string {
  const css = assetPath(assets.css);
  const js = assetPath(assets.js);
  const title = escapeText(head.title);
  const description = escapeAttribute(head.description);
  const canonical = escapeAttribute(head.canonical);
  const { og } = head;
  const primaryImage = og.images[0];
  const twitterCard = primaryImage.width >= 1200 && primaryImage.width > primaryImage.height
    ? 'summary_large_image'
    : 'summary';

  return `<!doctype html>
<html lang="en" class="dark" style="color-scheme: dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${description}" />
  <meta name="robots" content="${escapeAttribute(head.robots)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="${escapeAttribute(og.type)}" />
  <meta property="og:site_name" content="${escapeAttribute(og.site_name)}" />
  <meta property="og:locale" content="${escapeAttribute(og.locale)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${escapeAttribute(head.title)}" />
  <meta property="og:description" content="${description}" />
  ${ogImageTags(og.images)}
  <meta name="twitter:card" content="${twitterCard}" />${jsonLd(head, data)}
  <script>
    (() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation?.type === 'reload' && 'scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
        scrollTo(0, 0);
      }

      const root = document.documentElement;
      let theme = 'dark';
      try {
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') theme = saved;
      } catch (_) {}
      root.classList.toggle('dark', theme === 'dark');
      root.style.colorScheme = theme;
    })();
  </script>
  <link rel="icon" href="/favicon.svg" />
  <link rel="stylesheet" href="${css}" />
  <title>${title}</title>
</head>
<body>
  ${body}
  <script type="module" src="${js}"></script>
</body>
</html>`;
}

// One block of og:image/type/width/height/alt per candidate, in the order
// crawlers should try them (see the `images` field docs in Rust).
function ogImageTags(
  images: RenderInput['head']['og']['images'],
): string {
  return images
    .map((image) =>
      [
        `<meta property="og:image" content="${escapeAttribute(image.url)}" />`,
        `<meta property="og:image:type" content="${escapeAttribute(image.mime)}" />`,
        `<meta property="og:image:width" content="${image.width}" />`,
        `<meta property="og:image:height" content="${image.height}" />`,
        `<meta property="og:image:alt" content="${escapeAttribute(image.alt)}" />`,
      ].join('\n  ')
    )
    .join('\n  ');
}

function jsonLd(head: RenderInput['head'], data: Data): string {
  if (head.structured_data !== 'person') return '';

  const { about, en } = data;
  const graph = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: `${about.first_name} ${about.last_name}`,
    url: head.canonical,
    image: head.og.images[0].url,
    jobTitle: en.hero.role,
    description: head.description,
    sameAs: [en.buttons.github.url, en.buttons.linkedin.url],
  };

  return `\n  <script type="application/ld+json">${
    JSON.stringify(
      graph,
    ).replaceAll('<', '\\u003c')
  }</script>`;
}

function assetPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;');
}

function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
