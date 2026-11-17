import assert from 'node:assert/strict';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { initMotion } from './motion.ts';

Deno.test('revealing text never overwrites fresh data or a changed locale', async () => {
  GlobalRegistrator.register();
  const originalObserver = globalThis.IntersectionObserver;
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  let reveal: IntersectionObserverCallback;
  globalThis.IntersectionObserver = class {
    constructor(callback: IntersectionObserverCallback) {
      reveal = callback;
    }
    observe() {}
    unobserve() {}
  } as unknown as typeof IntersectionObserver;
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  };
  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id);
  };
  const advance = (time: number) => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(time);
  };

  try {
    document.body.innerHTML = '<section data-reveal>' +
      '<span data-count>100</span><p data-scramble>Selected work</p></section>';
    initMotion();
    const section = document.querySelector('section')!;
    reveal!(
      [{
        target: section,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: section.getBoundingClientRect(),
        intersectionRect: section.getBoundingClientRect(),
        rootBounds: null,
        time: performance.now(),
      }],
      {} as IntersectionObserver,
    );
    const start = performance.now();
    advance(start + 100);
    const count = document.querySelector('[data-count]')!;
    const label = document.querySelector('[data-scramble]')!;
    assert.notEqual(count.textContent, '100');
    assert.notEqual(label.textContent, 'Selected work');
    count.textContent = '95.1k';
    label.textContent = 'Utvalgt arbeid';
    advance(start + 200);
    advance(start + 2000);
    assert.equal(count.textContent, '95.1k');
    assert.equal(label.textContent, 'Utvalgt arbeid');
  } finally {
    globalThis.IntersectionObserver = originalObserver;
    globalThis.requestAnimationFrame = originalRequest;
    globalThis.cancelAnimationFrame = originalCancel;
    await GlobalRegistrator.unregister();
  }
});
