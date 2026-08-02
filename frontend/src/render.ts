import { build_client, http } from '@qubit-rs/client';
import { loader } from '@ilha/router';

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

  const result = await pageRouter.renderResponse(
    input.url,
    registry,
    { snapshot: false },
  );

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

  const footerHtml = await footer.hydratable(
    {},
    { name: 'footer', as: 'div' },
  );

  const body =
    `<main class="site-layout">${headerHtml}<div class="site-page-content"><div id="app" style="flex: 1">${result.html}</div>${footerHtml}</div></main>`;
  const html = documentShell(body, data, input.assets);

  return {
    id: input.id,
    status: result.kind === 'error' ? result.status : result.status ?? 200,
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
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<T, K>;
}

function documentShell(
  body: string,
  data: Data,
  assets: RenderInput['assets'],
): string {
  const css = assetPath(assets.css);
  const js = assetPath(assets.js);
  const description = escapeAttribute(data.en.meta.description);

  return `<!doctype html>
<html lang="en" class="dark" style="color-scheme: dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${description}" />
  <meta name="robots" content="index, follow" />
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
  <title>Thomas Jensen</title>
</head>
<body>
  ${body}
  <script type="module" src="${js}"></script>
</body>
</html>`;
}

function assetPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
