import assert from 'node:assert/strict';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import type { JsonRecord } from '@ilha/void';
import { createIsland } from '@ilha/void/server';
import { type IslandModule, mountIsland } from '@ilha/void/islands';
import { renderToString } from 'ilha';
import portfolioData from '../../../backend/data/data.json' with { type: 'json' };
import type { Data } from '../bindings/index.ts';
import Footer from '../islands/footer.tsx';
import Header from '../islands/header.tsx';
import { islandPages } from '../islands/pages.ts';
import { renderPage } from '../pages.ts';
import { initLocale, setLocale, useLocale } from './locale.ts';
import { setServerData } from './server-data.ts';

Deno.test('Void islands honor saved locale instead of the SSR default', async () => {
  function Language() {
    return <p>{useLocale()()}</p>;
  }
  const Island = createIsland(Language, { id: 'language', hydrate: 'load' });
  const html = await renderToString(() => <Island />);

  GlobalRegistrator.register();
  try {
    document.body.innerHTML = html;
    assert.equal(document.querySelector('p')?.textContent, 'en');
    localStorage.setItem('locale', 'no');
    initLocale();
    mountIsland(document.querySelector<HTMLElement>('[data-island]')!, {
      default: Language,
    }, {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(document.querySelector('p')?.textContent, 'no');
    assert.equal(document.documentElement.lang, 'nb');

    setLocale('en');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(document.querySelector('p')?.textContent, 'en');
    assert.equal(localStorage.getItem('locale'), 'en');
  } finally {
    document.body.replaceChildren();
    await GlobalRegistrator.unregister();
  }
});

Deno.test('language selection updates page content and footer without a reload', async () => {
  const data = portfolioData as unknown as Data;
  setServerData({ data, experience: data.experience_items });
  const cases = [
    ['/', 'Open for work', 'Åpen for arbeid'],
    [
      '/projects',
      'Rust, native software, and shipped products.',
      'Rust, native programvare og lanserte produkter.',
    ],
    ['/experience', 'Experience', 'Erfaring'],
    ['/projects/[slug]', 'More projects', 'Flere prosjekter'],
    ['/contact', 'Send a note', 'Send en melding'],
  ];
  for (const [component, english, norwegian] of cases) {
    const html = await renderPage({
      component,
      props: component === '/projects/[slug]' ? { project: data.projects[0] } : {},
      params: {},
      shared: { path: component },
      url: component,
      errors: null,
    }, { css: '', preloads: '', body: '' });

    GlobalRegistrator.register();
    try {
      document.body.innerHTML = html;
      if (component === '/') {
        assert.equal(
          document.querySelector('img[src="/static/headshot.webp"]')!.getAttribute('draggable'),
          'false',
          'the server-rendered portrait must not be draggable',
        );
      }
      localStorage.setItem('locale', 'en');
      initLocale();
      for (const el of document.querySelectorAll<HTMLElement>('[data-island]')) {
        const id = el.dataset.island!;
        const module = id === 'header'
          ? { default: Header }
          : id === 'footer'
          ? { default: Footer }
          : await islandPages[id]();
        mountIsland(el, module as IslandModule<JsonRecord>, JSON.parse(el.dataset.props!));
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      const page = () => document.querySelector('.site-page-main')!.textContent!;
      assert.ok(page().includes(english), `${component}: English before switching`);
      const input = document.querySelector<HTMLInputElement>('#contact-name');
      if (input) input.value = 'Keep this draft';

      for (
        const [code, expected, hidden] of [
          ['no', norwegian, english],
          ['en', english, norwegian],
        ]
      ) {
        document.querySelector<HTMLButtonElement>(`button[data-locale="${code}"]`)!.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.ok(page().includes(expected), `${component}: missing ${code} content`);
        assert.ok(
          !page().includes(hidden),
          `${component}: stale content after switching to ${code}`,
        );
        if (component === '/contact') {
          assert.equal(document.querySelector('footer'), null);
          assert.equal(document.querySelector('#contact header'), null);
          assert.equal(document.querySelector('h1')?.textContent, expected);
        } else {
          assert.ok(document.querySelector('footer')!.textContent!.includes(
            code === 'no' ? 'Porteføljestack' : 'Portfolio stack',
          ));
        }
        assert.equal(localStorage.getItem('locale'), code);
        assert.equal(document.documentElement.lang, code === 'no' ? 'nb' : 'en');
        if (component === '/') {
          assert.equal(
            document.querySelector('img[src="/static/headshot.webp"]')!.getAttribute('draggable'),
            'false',
            'the portrait must stay non-draggable after switching languages',
          );
        }
        if (input) {
          assert.equal(
            document.querySelector<HTMLInputElement>('#contact-name')!.value,
            'Keep this draft',
          );
        }
      }
    } finally {
      document.body.replaceChildren();
      await GlobalRegistrator.unregister();
    }
  }
});
