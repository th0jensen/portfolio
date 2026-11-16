import { build_client, http } from '@qubit-rs/client';
import { renderHeadToString } from 'void/pages-head';
import type { HeadDescriptor } from 'void/pages-head';
import type { Data, QubitServer, RenderInput, RenderOutput } from './bindings/index.ts';
import { pages, renderPage } from './pages.ts';
import { setServerData } from './lib/server-data.ts';

export async function render(input: RenderInput): Promise<RenderOutput> {
  const url = new URL(input.url, 'http://renderer');
  const api = build_client<QubitServer>(http(`${input.rpc_origin}/rpc`));
  const [data, experience] = await Promise.all([
    api.data.query(),
    url.pathname === '/' || url.pathname === '/experience'
      ? api.experience.query()
      : Promise.resolve([]),
  ]);

  setServerData({ data, experience });
  const slug = /^\/projects\/([^/]+)$/.exec(url.pathname)?.[1];
  const project = data.projects.find((item) => item.slug === slug);
  const component = project
    ? '/projects/[slug]'
    : Object.hasOwn(pages, url.pathname)
    ? url.pathname
    : '/error';

  const html = await renderPage({
    component,
    props: project ? { project } : {},
    params: slug ? { slug } : {},
    shared: { path: url.pathname },
    url: url.pathname + url.search,
    errors: null,
    head: pageHead(input, data),
  }, {
    css: '',
    preloads: '',
    body: renderHeadToString({
      script: [{ type: 'module', src: assetPath(input.assets.js) }],
    }),
  });

  return {
    id: input.id,
    status: component === '/error' && url.pathname !== '/error' ? 404 : 200,
    html,
    error: null,
    headers: {},
  };
}

function pageHead({ assets, head }: RenderInput, data: Data): HeadDescriptor {
  const { og } = head;
  const primaryImage = og.images[0];
  const twitterCard = primaryImage.width >= 1200 && primaryImage.width > primaryImage.height
    ? 'summary_large_image'
    : 'summary';

  return {
    title: head.title,
    htmlAttrs: { lang: 'en', class: 'dark', style: 'color-scheme: dark' },
    meta: [
      { charset: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { name: 'description', content: head.description },
      { name: 'robots', content: head.robots },
      { property: 'og:type', content: og.type },
      { property: 'og:site_name', content: og.site_name },
      { property: 'og:locale', content: og.locale },
      { property: 'og:url', content: head.canonical },
      { property: 'og:title', content: head.title },
      { property: 'og:description', content: head.description },
      ...og.images.flatMap((image) => [
        { property: 'og:image', content: image.url },
        { property: 'og:image:type', content: image.mime },
        { property: 'og:image:width', content: String(image.width) },
        { property: 'og:image:height', content: String(image.height) },
        { property: 'og:image:alt', content: image.alt },
      ]),
      { name: 'twitter:card', content: twitterCard },
    ],
    link: [
      { rel: 'canonical', href: head.canonical },
      { rel: 'icon', href: '/favicon.svg' },
      { rel: 'stylesheet', href: assetPath(assets.css) },
    ],
    script: [
      ...(head.structured_data === 'person'
        ? [{ type: 'application/ld+json', innerHTML: personJson(head, data) }]
        : []),
      {
        innerHTML: `(() => {
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
        })();`,
      },
    ],
  };
}

function personJson(head: RenderInput['head'], data: Data): string {
  const { about, en } = data;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: `${about.first_name} ${about.last_name}`,
    url: head.canonical,
    image: head.og.images[0].url,
    jobTitle: en.hero.role,
    description: head.description,
    sameAs: [en.buttons.github.url, en.buttons.linkedin.url],
  }).replaceAll('<', '\\u003c');
}

function assetPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}
