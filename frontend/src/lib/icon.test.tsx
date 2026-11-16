import assert from 'node:assert/strict';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { atom, mount, renderToString } from 'ilha';
import { Moon, Sun } from 'lucide';
import Icon from './icon.tsx';

Deno.test('icons retain SVG namespaces through hydration and reactive updates', async () => {
  GlobalRegistrator.register();
  const host = document.createElement('div');
  document.body.append(host);
  let unmount: (() => void) | undefined;

  function Toggle() {
    const dark = atom(false);
    return (
      <button type='button' onclick={() => dark.set(!dark())}>
        <Icon node={dark() ? Moon : Sun} size={17} />
      </button>
    );
  }

  function assertIcon() {
    const svg = host.querySelector('svg');
    assert.ok(svg instanceof SVGElement);
    assert.equal(svg.namespaceURI, 'http://www.w3.org/2000/svg');
    for (const child of svg.querySelectorAll('*')) {
      assert.equal(child.namespaceURI, 'http://www.w3.org/2000/svg');
    }
    assert.equal(svg.getAttribute('viewBox'), '0 0 24 24');
    assert.equal(svg.getAttribute('width'), '17');
    assert.equal(svg.getAttribute('height'), '17');
    const button = host.querySelector('button');
    assert.ok(button instanceof HTMLButtonElement);
    assert.equal(button.namespaceURI, 'http://www.w3.org/1999/xhtml');
    return button;
  }

  try {
    host.innerHTML = await renderToString(Toggle);
    assertIcon();
    unmount = mount(host.firstElementChild!, Toggle, { hydrate: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    let button = assertIcon();
    assert.ok(host.querySelector('circle'));

    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    button = assertIcon();
    assert.equal(host.querySelector('circle'), null);
    assert.equal(host.querySelectorAll('path').length, 1);

    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assertIcon();
    assert.ok(host.querySelector('circle'));
  } finally {
    unmount?.();
    host.remove();
    await GlobalRegistrator.unregister();
  }
});
