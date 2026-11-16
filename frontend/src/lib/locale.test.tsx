import assert from 'node:assert/strict';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { createIsland } from '@ilha/void/server';
import { mountIsland } from '@ilha/void/islands';
import { renderToString } from 'ilha';
import { initLocale, setLocale, useLocale } from './locale.ts';

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
