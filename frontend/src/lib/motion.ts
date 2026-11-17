/**
 * Interaction-aware motion for server-rendered markup. Everything is driven by
 * data attributes and delegated listeners, so it survives island re-renders:
 *
 * - `[data-reveal]` fades and lifts in when scrolled into view; with
 *   `data-reveal='stagger'` its children enter one after another instead.
 *   ilha's morph strips attributes it did not render, so revealed elements
 *   carry `data-morph-preserve='data-revealed'` (see `reveal` below).
 * - `[data-spotlight]` exposes the pointer position as `--mx`/`--my`.
 * - `[data-tilt]` leans toward the pointer.
 * - `[data-count]` counts its number up when revealed.
 * - `[data-scramble]` decodes its text when revealed or its group hovered.
 * - `--scroll` on the root is document scroll progress in [0, 1].
 * - `[data-scroll-scene]` gets `--progress` through its pinned scroll and
 *   `data-step`, one of `data-steps` evenly spaced stops.
 * - `[data-tile-edges]` (class `tile-edges`) gets tiled top and bottom edges:
 *   tiles flip throughout the visible travel, with the last ones landing
 *   on the header line.
 */

/** Spread on an element to animate it in: `<div {...reveal}>`. */
export const reveal = { 'data-reveal': '', 'data-morph-preserve': 'data-revealed' } as const;
export const revealStagger = { ...reveal, 'data-reveal': 'stagger' } as const;

const GLYPHS = '!<>-_\\/[]{}—=+*^?#01';
const seen = new WeakSet<Element>();
let reducedMotion = false;
let revealObserver: IntersectionObserver | undefined;
const scrambling = new WeakMap<HTMLElement, { frame: number; final: string; rendered: string }>();

export function initMotion(): void {
  const root = document.documentElement;
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('motion-ready');

  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      show(entry.target as HTMLElement);
      revealObserver?.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  let scrollFrame = 0;
  const onScroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const max = root.scrollHeight - innerHeight;
      root.style.setProperty('--scroll', String(max > 0 ? scrollY / max : 0));
      for (const scene of document.querySelectorAll<HTMLElement>('[data-scroll-scene]')) {
        const rect = scene.getBoundingClientRect();
        const progress = Math.min(
          1,
          Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)),
        );
        const steps = Number(scene.dataset.steps) || 1;
        scene.style.setProperty('--progress', progress.toFixed(4));
        const step = String(Math.min(steps - 1, Math.round(progress * (steps - 1))));
        if (scene.dataset.step !== step) scene.dataset.step = step;
      }
      const header = document.querySelector('[data-site-header]')?.getBoundingClientRect().bottom ??
        0;
      for (const surface of document.querySelectorAll<HTMLElement>('[data-tile-edges]')) {
        tileEdges(surface, header);
      }
    });
  };
  globalThis.addEventListener('scroll', onScroll, { passive: true });
  globalThis.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  document.addEventListener('pointermove', (event) => {
    const target = event.target as Element | null;
    const spot = target?.closest('[data-spotlight]') as HTMLElement | null | undefined;
    if (spot) {
      const rect = spot.getBoundingClientRect();
      spot.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      spot.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }
    if (reducedMotion || event.pointerType !== 'mouse') return;
    const tilt = target?.closest('[data-tilt]') as HTMLElement | null | undefined;
    if (tilt) {
      const rect = tilt.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      tilt.style.setProperty('--tilt-x', `${(-y * 6).toFixed(2)}deg`);
      tilt.style.setProperty('--tilt-y', `${(x * 8).toFixed(2)}deg`);
    }
  }, { passive: true });
  document.addEventListener('pointerout', (event) => {
    const tilt = (event.target as Element | null)?.closest('[data-tilt]') as
      | HTMLElement
      | null
      | undefined;
    if (tilt && !tilt.contains(event.relatedTarget as Node | null)) {
      tilt.style.removeProperty('--tilt-x');
      tilt.style.removeProperty('--tilt-y');
    }
  });
  document.addEventListener('pointerover', (event) => {
    const group = (event.target as Element | null)?.closest('[data-scramble-group]');
    if (!group || group.contains(event.relatedTarget as Node | null)) return;
    for (const element of group.querySelectorAll<HTMLElement>('[data-scramble]')) {
      scramble(element);
    }
  });

  new MutationObserver(() => {
    scan();
    onScroll();
  }).observe(document.body, { childList: true, subtree: true });
  scan();
}

const edgeState = new WeakMap<HTMLElement, string>();
/** Share of a tile's flip threshold that is random; the rest is its row. */
const EDGE_NOISE = 0.6;

/**
 * Clips the surface to its solid middle plus the tiles that are showing in its
 * top and bottom bands. A clip path is plain geometry, so it applies in the
 * same frame; a mask image would be decoded asynchronously and flash.
 */
function tileEdges(surface: HTMLElement, header: number): void {
  const rect = surface.getBoundingClientRect();
  const edge = remOrPx(getComputedStyle(document.documentElement).getPropertyValue('--tile-edge'));
  if (edge === 0 || rect.width === 0) return;
  // The tiles flip from the solid boundary entering the viewport to the
  // band's leading edge reaching the header, and the last one lands on the
  // header line. Each edge enters as a straight line, opens into tiles during
  // its travel, then closes into a straight line again as it lands.
  const travel = Math.max(1, innerHeight - header - edge);
  // Row-biased thresholds make tile changes sparse at both ends. Compensate
  // symmetrically so the visible pattern picks up quickly, keeps moving
  // through the middle, and slows only briefly as the last tiles land.
  const curve = (t: number) => t ** 0.6 / (t ** 0.6 + (1 - t) ** 0.6);
  const progress = (top: number) =>
    reducedMotion ? 1 : curve(Math.min(1, Math.max(0, (innerHeight - edge - top) / travel)));
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  const top = progress(rect.top);
  const bottom = progress(rect.bottom - edge);
  const key = `${width}:${height}:${edge}:${top}:${bottom}`;
  if (edgeState.get(surface) === key) return;
  edgeState.set(surface, key);
  const pitch = innerWidth < 640 ? 6 : 10;
  const cols = Math.ceil(width / pitch);
  const rows = Math.max(1, Math.round(edge / pitch));
  // The top band shows tiles that have flipped (the surface arrives); the
  // bottom band shows tiles that have not (the surface leaves).
  const path = `M0 ${edge}H${width}V${height - edge}H0Z` +
    band(cols, rows, width, edge, 0, top, true) +
    band(cols, rows, width, edge, height - edge, bottom, false);
  surface.style.setProperty('clip-path', `path('${path}')`);
}

function band(
  cols: number,
  rows: number,
  width: number,
  height: number,
  y0: number,
  progress: number,
  flipped: boolean,
): string {
  if (progress >= 1) return flipped ? `M0 ${y0}H${width}V${y0 + height}H0Z` : '';
  if (progress <= 0) return flipped ? '' : `M0 ${y0}H${width}V${y0 + height}H0Z`;
  let path = '';
  const x = (col: number) => Math.round((col * width) / cols);
  for (let row = 0; row < rows; row++) {
    const depth = rows > 1 ? row / (rows - 1) : 1;
    const y = y0 + Math.round((row * height) / rows);
    const y1 = y0 + Math.round(((row + 1) * height) / rows);
    let run = -1;
    for (let col = 0; col <= cols; col++) {
      // Bottom rows first. Thresholds lie in [0, 1), so at 0 nothing has
      // flipped and at 1 everything has: the edge ends as one straight line.
      const on = col < cols &&
        (progress > (1 - depth) * (1 - EDGE_NOISE) + seed(row * cols + col) * EDGE_NOISE) ===
          flipped;
      if (on && run < 0) run = col;
      if (!on && run >= 0) {
        path += `M${x(run)} ${y}H${x(col)}V${y1}H${x(run)}Z`;
        run = -1;
      }
    }
  }
  return path;
}

function remOrPx(value: string): number {
  const number = parseFloat(value);
  return value.trim().endsWith('rem')
    ? number * parseFloat(getComputedStyle(document.documentElement).fontSize)
    : number || 0;
}

function seed(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function scan(): void {
  for (
    const element of document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')
  ) {
    if (seen.has(element)) continue;
    seen.add(element);
    // Content re-rendered while on screen appears at once instead of
    // replaying its entrance.
    const rect = element.getBoundingClientRect();
    if (performance.now() > 2500 && rect.top < innerHeight && rect.bottom > 0) {
      element.dataset.revealed = 'instant';
      continue;
    }
    revealObserver?.observe(element);
  }
}

function show(element: HTMLElement): void {
  element.dataset.revealed = '';
  for (const counter of element.querySelectorAll<HTMLElement>('[data-count]')) count(counter);
  if (element.hasAttribute('data-count')) count(element);
  for (const text of element.querySelectorAll<HTMLElement>('[data-scramble]')) scramble(text);
  if (element.hasAttribute('data-scramble')) scramble(element);
}

function count(element: HTMLElement): void {
  if (reducedMotion || element.dataset.counted) return;
  element.dataset.counted = '1';
  const final = element.textContent ?? '';
  const match = /^([^\d]*)([\d.]+)(.*)$/.exec(final);
  if (!match) return;
  const [, prefix, digits, suffix] = match;
  const target = Number(digits);
  const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;
  const start = performance.now();
  let rendered = final;
  const step = (now: number) => {
    // A locale change or fresh server data owns the text from that point on.
    if (!element.isConnected || element.textContent !== rendered) return;
    const t = Math.min(1, (now - start) / 1100);
    const eased = 1 - Math.pow(1 - t, 4);
    rendered = t < 1 ? `${prefix}${(target * eased).toFixed(decimals)}${suffix}` : final;
    element.textContent = rendered;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function scramble(element: HTMLElement): void {
  if (reducedMotion || element.children.length > 0) return;
  const previous = scrambling.get(element);
  const text = element.textContent ?? '';
  const final = previous?.rendered === text ? previous.final : text;
  cancelAnimationFrame(previous?.frame ?? 0);
  const animation = { frame: 0, final, rendered: text };
  scrambling.set(element, animation);
  const start = performance.now();
  const duration = 420 + final.length * 18;
  const step = (now: number) => {
    if (!element.isConnected || element.textContent !== animation.rendered) return;
    const progress = (now - start) / duration;
    let out = '';
    for (let i = 0; i < final.length; i++) {
      const char = final[i];
      out += char === ' ' || progress * final.length > i
        ? char
        : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    animation.rendered = progress >= 1 ? final : out;
    element.textContent = animation.rendered;
    if (progress < 1) animation.frame = requestAnimationFrame(step);
  };
  animation.frame = requestAnimationFrame(step);
}
