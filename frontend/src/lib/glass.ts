/**
 * Chromium uses SVG in `backdrop-filter` to bend the backdrop inward and
 * spread it sideways at the glass edge. A separate thin rim diffuses light
 * from beside the glass. Other engines retain the CSS frost.
 */

import { fieldGrid } from './dot-matrix.ts';

type Lens = 'all' | 'bottom';
type Glass = { layer: HTMLElement; lens: Lens; filter?: SVGFilterElement; size?: string };
type Edge = 'top' | 'right' | 'bottom' | 'left';
type Region = readonly [x: number, y: number, width: number, height: number];

// 3× the original 15 px band, peak and strength; the curve keeps its shape.
const BEZEL_WIDTH = 45;
// Content at depth d reads from d + BEND·p(d), p rising to 1 at BEND_PEAK then easing back to 0
// at the bezel's inner edge: squeezed towards the rim, then gently stretched, never past the edge.
const BEND = 9;
const GRID_BEND = 7;
const BEND_PEAK = 9;
// Chromium rounds a 0.2px SVG Gaussian to zero. Use a subpixel blur that survives rasterization.
const FROST_DEVICE_PX = 0.8;
const BEZEL_FROST = 0.62;
const FROST_START = 21;
// Capture this many CSS pixels past the visible boundary for the rim light.
const REACH = 12;
const RIM_WIDTH = 2;
const RIM_SAMPLE_OFFSET = 4;
const TINT_FEATHER = 0.7;
// Diffuse what has just been bent past the rim: full strength to EDGE_DIFFUSE_FULL px,
// then fading out by EDGE_DIFFUSE_END px.
const EDGE_DIFFUSE = 1.1;
const EDGE_DIFFUSE_FULL = 3;
const EDGE_DIFFUSE_END = 7;
// Near the rim the glass is clearer than its face, so the bent content reads: the tint keeps
// RIM_CLARITY of its strength to TINT_CLEAR_FULL px, then returns to full by TINT_CLEAR_END px.
const RIM_CLARITY = 0.3;
const TINT_CLEAR_FULL = 4;
const TINT_CLEAR_END = 18;
// No shift in red and green, full frost in blue.
const NEUTRAL = 0xffff8080;
const SVG = 'http://www.w3.org/2000/svg';

const glasses = new Map<HTMLElement, Glass>();
const pending = new Set<HTMLElement>();
let defs: SVGDefsElement | undefined;
let resizer: ResizeObserver | undefined;
let frame = 0;
let count = 0;

export function initGlass(): void {
  // Only Chromium renders SVG displacement filters in backdrop-filter.
  if (
    !('userAgentData' in navigator) || matchMedia('(prefers-reduced-transparency: reduce)').matches
  ) {
    return;
  }
  resizer = new ResizeObserver((entries) => {
    for (const entry of entries) schedule(entry.target as HTMLElement);
  });
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  // A resize can also change DPR without changing an individual card's CSS size.
  globalThis.addEventListener('resize', () => {
    for (const host of glasses.keys()) schedule(host);
  }, { passive: true });
  globalThis.addEventListener('scroll', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    if (header) schedule(header);
  }, { passive: true });
  scan();
}

function scan(): void {
  for (const [host, glass] of glasses) {
    if (host.isConnected && glass.layer.isConnected) continue;
    glass.filter?.remove();
    resizer?.unobserve(host);
    glasses.delete(host);
  }
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const headerLens = document.querySelector<HTMLElement>('[data-glass-lens="header"]');
  if (header && headerLens) install(header, headerLens, 'bottom');
  for (const layer of document.querySelectorAll<HTMLElement>('.glass-card > .glass-lens')) {
    install(layer.parentElement!, layer, 'all');
  }
}

function install(host: HTMLElement, layer: HTMLElement, lens: Lens): void {
  if (!glasses.has(host)) {
    glasses.set(host, { layer, lens });
    resizer?.observe(host);
  }
  schedule(host);
}

function schedule(host: HTMLElement): void {
  pending.add(host);
  if (!frame) {
    frame = requestAnimationFrame(() => {
      frame = 0;
      for (const item of pending) {
        const glass = glasses.get(item);
        if (glass) update(item, glass);
      }
      pending.clear();
    });
  }
}

// Dot fields are the only backdrops with small discrete features that have a
// known center. Keep their phase, but never read from a canvas painted in front of glass.
function backdropGrid(rect: DOMRect, lens: Lens) {
  for (
    const canvas of document.querySelectorAll<HTMLCanvasElement>('canvas[data-dot-matrix="field"]')
  ) {
    if (canvas.closest('.glass-card')) continue;
    const field = fieldGrid(canvas);
    if (!field?.pitchX || !field.pitchY) continue;
    const { left, top, right, bottom } = field.rect;
    if (
      right <= rect.left || left >= rect.right || top >= rect.bottom ||
      bottom <= (lens === 'bottom' ? rect.bottom - BEZEL_WIDTH : rect.top)
    ) continue;
    return {
      x: left - rect.left + field.pitchX / 2,
      y: lens === 'all' ? top - rect.top + field.pitchY / 2 : 0,
      pitchX: field.pitchX,
      pitchY: lens === 'all' ? field.pitchY : 0,
    };
  }
}

function update(host: HTMLElement, glass: Glass): void {
  const rect = host.getBoundingClientRect();
  const { width, height } = rect;
  if (!width || !height) return;
  const dpr = devicePixelRatio || 1;
  const grid = backdropGrid(rect, glass.lens);
  const size = JSON.stringify([width, height, dpr, grid]);
  if (glass.size === size) return;
  applyFilter(glass, width, height, dpr, lensShift(glass.lens, width, height, grid));
  glass.size = size;
}

type Shift = {
  /** Inward shift along the edge normal. */
  at: (x: number, y: number) => readonly [dx: number, dy: number];
  range: number;
};

/** Sampling basis in CSS pixels at each point of a `width` × `height` surface. */
function lensShift(
  lens: Lens,
  width: number,
  height: number,
  grid: ReturnType<typeof backdropGrid>,
): Shift {
  const bezel = Math.min(BEZEL_WIDTH, width / 2, height / (lens === 'all' ? 2 : 1));
  const ratio = bezel / BEZEL_WIDTH;
  const strength = (grid ? GRID_BEND : BEND) * ratio;
  const peak = BEND_PEAK * ratio;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  // The rim band hides the outer RIM_WIDTH px, so the border's own content lands at its inner
  // edge; that extra offset fades out across the bezel.
  const magnitude = (depth: number) => {
    if (depth <= 0 || depth >= bezel) return 0;
    const at = Math.max(0, depth - RIM_WIDTH * (1 - smooth(depth / bezel)));
    const p = at <= peak ? smooth(at / peak) : smooth((bezel - at) / (bezel - peak));
    return at + strength * p - depth;
  };
  let max = 0;
  for (let d = 0; d <= bezel; d += 0.25) max = Math.max(max, Math.abs(magnitude(d)));
  // Bend straight along the normal. At a corner both edges' normals add up.
  return {
    at: lens === 'bottom' ? (_, y) => [0, -magnitude(height - y)] : (x, y) => {
      const px = magnitude(Math.min(x, width - x));
      const py = magnitude(Math.min(y, height - y));
      return [x < width / 2 ? px : -px, y < height / 2 ? py : -py];
    },
    range: max,
  };
}

function setRegion(node: Element, [x, y, width, height]: Region): void {
  node.setAttribute('x', String(x));
  node.setAttribute('y', String(y));
  node.setAttribute('width', String(width));
  node.setAttribute('height', String(height));
}

function applyFilter(glass: Glass, width: number, height: number, dpr: number, shift: Shift): void {
  const all = glass.lens === 'all';
  const left = all ? REACH : 0;
  const top = all ? REACH : 0;
  const right = left + width;
  const bottom = top + height;
  const layerWidth = right + left;
  const layerHeight = bottom + REACH;
  const bounds: Region = [left, top, width, height];
  const edges: Edge[] = all ? ['top', 'bottom', 'left', 'right'] : ['bottom'];

  if (!glass.filter) {
    if (!defs) {
      const svg = document.createElementNS(SVG, 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      defs = document.createElementNS(SVG, 'defs');
      svg.append(defs);
      document.body.append(svg);
    }
    const filter = document.createElementNS(SVG, 'filter');
    filter.id = all ? `glass-lens-${++count}` : 'glass-lens-header';
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    // Crop the input first: the lens can see behind the rim, but not beyond it.
    filter.innerHTML = `<feOffset in="SourceGraphic" result="contained"/>` +
      `<feImage preserveAspectRatio="none" result="bend"/>` +
      `<feDisplacementMap in="contained" in2="bend" xChannelSelector="R" ` +
      `yChannelSelector="G" result="bent"/>` +
      // Frost after bending. The map's blue channel fades it in towards the face.
      `<feGaussianBlur in="bent" edgeMode="duplicate" result="frost"/>` +
      `<feColorMatrix in="bend" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0" result="frost-mask"/>` +
      `<feComposite in="frost" in2="frost-mask" operator="in" result="softened"/>` +
      `<feComposite in="softened" in2="bent" operator="over" result="frosted-body"/>` +
      `<feGaussianBlur in="bent" edgeMode="duplicate" stdDeviation="${EDGE_DIFFUSE}" ` +
      `result="edge-blur"/><feImage preserveAspectRatio="none" result="edge-mask"/>` +
      `<feComposite in="edge-blur" in2="edge-mask" operator="in" result="edge-soft"/>` +
      `<feComposite in="edge-soft" in2="frosted-body" operator="over" result="frosted-glass"/>` +
      // Feather the tint alone so it doesn't draw a hard cut across bent details.
      `<feFlood class="glass-tint" result="body-tint"/>` +
      `<feGaussianBlur in="body-tint" stdDeviation="${
        all ? TINT_FEATHER : '0 1.45'
      }" result="tint-feathered"/><feImage preserveAspectRatio="none" result="tint-mask"/>` +
      `<feComposite in="tint-feathered" in2="tint-mask" operator="in" result="tint"/>` +
      `<feComposite in="tint" in2="frosted-glass" operator="over" result="tinted"/>` +
      // Cover the bent content under the rim so the rim sits above it.
      edges.map((edge) => `<feFlood class="glass-rim" result="cover-${edge}"/>`).join('') +
      `<feMerge result="cover">` +
      edges.map((edge) => `<feMergeNode in="cover-${edge}"/>`).join('') +
      `</feMerge><feComposite in="cover" in2="tinted" operator="over" result="glass"/>` +
      // The rim only sees the exterior strips. Blur these into light, not a copy of the image.
      edges.map((edge) => {
        const horizontal = edge === 'top' || edge === 'bottom';
        return `<feOffset in="SourceGraphic" result="outside-${edge}"/>` +
          `<feGaussianBlur in="outside-${edge}" edgeMode="duplicate" stdDeviation="${
            horizontal ? '8 2' : '2 8'
          }" ` +
          `result="diffused-${edge}"/>` +
          `<feOffset in="diffused-${edge}" result="rim-${edge}"/>`;
      }).join('') +
      `<feMerge result="edge-colour">` +
      edges.map((edge) => `<feMergeNode in="rim-${edge}"/>`).join('') +
      `</feMerge><feComponentTransfer in="edge-colour" result="rim-light">` +
      // Suppress near-black ambient colour, and add light rather than painting an outline.
      ['R', 'G', 'B'].map((c) => `<feFunc${c} type="linear" slope="1.35" intercept="-0.075"/>`)
        .join('') +
      `</feComponentTransfer>` +
      // Add the adjacent light over the glass; it doesn't replace the glass beneath the rim.
      `<feBlend in="rim-light" in2="glass" mode="screen"/>`;
    defs.append(filter);
    glass.filter = filter;
  }
  const filter = glass.filter;
  filter.querySelector('feGaussianBlur')!.setAttribute(
    'stdDeviation',
    String(FROST_DEVICE_PX / dpr),
  );
  const mapScale = Math.min(2, dpr);
  const mapWidth = Math.round(layerWidth * mapScale);
  const mapHeight = Math.round(layerHeight * mapScale);
  const bend = new ImageData(mapWidth, mapHeight);
  const edgeMask = new ImageData(mapWidth, mapHeight);
  const tintMask = new ImageData(mapWidth, mapHeight);
  new Uint32Array(tintMask.data.buffer).fill(0xffffffff);
  new Uint32Array(bend.data.buffer).fill(NEUTRAL);
  const encode = (shift_: number) => Math.round(127.5 + shift_ / shift.range * 127.5);
  for (let my = 0; my < mapHeight; my++) {
    const y = (my + 0.5) * layerHeight / mapHeight - top;
    if (y < 0 || y > height || (!all && height - y >= BEZEL_WIDTH)) continue;
    for (let mx = 0; mx < mapWidth; mx++) {
      const x = (mx + 0.5) * layerWidth / mapWidth - left;
      if (x < 0 || x > width) continue;
      const depth = all ? Math.min(x, y, width - x, height - y) : height - y;
      if (depth >= BEZEL_WIDTH) continue;
      const i = (my * mapWidth + mx) * 4;
      const [dx, dy] = shift.at(x, y);
      bend.data[i] = encode(dx);
      bend.data[i + 1] = encode(dy);
      const t = Math.max(0, (depth - FROST_START) / (BEZEL_WIDTH - FROST_START));
      bend.data[i + 2] = Math.round(255 * (BEZEL_FROST + (1 - BEZEL_FROST) * t * t * (3 - 2 * t)));
      const e = Math.min(
        1,
        Math.max(0, (EDGE_DIFFUSE_END - depth) / (EDGE_DIFFUSE_END - EDGE_DIFFUSE_FULL)),
      );
      edgeMask.data.fill(255, i, i + 3);
      edgeMask.data[i + 3] = Math.round(255 * e * e * (3 - 2 * e));
      const c = Math.min(
        1,
        Math.max(0, (depth - TINT_CLEAR_FULL) / (TINT_CLEAR_END - TINT_CLEAR_FULL)),
      );
      tintMask.data[i + 3] = Math.round(
        255 * (RIM_CLARITY + (1 - RIM_CLARITY) * c * c * (3 - 2 * c)),
      );
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = mapWidth;
  canvas.height = mapHeight;
  const context = canvas.getContext('2d')!;
  setRegion(filter, [0, 0, layerWidth, layerHeight]);
  for (
    const [result, image] of [['bend', bend], ['edge-mask', edgeMask], [
      'tint-mask',
      tintMask,
    ]] as const
  ) {
    const map = filter.querySelector(`[result="${result}"]`)!;
    context.putImageData(image, 0, 0);
    setRegion(map, [0, 0, layerWidth, layerHeight]);
    map.setAttribute('href', canvas.toDataURL());
  }
  for (const edge of edges) {
    const horizontal = edge === 'top' || edge === 'bottom';
    const before = edge === 'top' || edge === 'left';
    const boundary = horizontal ? (before ? top : bottom) : (before ? left : right);
    const offset = before ? RIM_SAMPLE_OFFSET : -RIM_SAMPLE_OFFSET;
    const rimStart = before ? boundary : boundary - RIM_WIDTH;
    setRegion(
      filter.querySelector(`[result="outside-${edge}"]`)!,
      horizontal
        ? [0, before ? 0 : boundary, layerWidth, REACH]
        : [before ? 0 : boundary, 0, REACH, layerHeight],
    );
    const rim = filter.querySelector(`[result="rim-${edge}"]`)!;
    rim.setAttribute(horizontal ? 'dy' : 'dx', String(offset));
    setRegion(
      filter.querySelector(`[result="diffused-${edge}"]`)!,
      horizontal
        ? [left, rimStart - offset, width, RIM_WIDTH]
        : [rimStart - offset, top, RIM_WIDTH, height],
    );
    const rimBand: Region = horizontal
      ? [left, rimStart, width, RIM_WIDTH]
      : [rimStart, top, RIM_WIDTH, height];
    setRegion(rim, rimBand);
    setRegion(filter.querySelector(`[result="cover-${edge}"]`)!, rimBand);
  }
  setRegion(filter.querySelector('[result="contained"]')!, bounds);
  const displacement = filter.querySelector('feDisplacementMap')!;
  setRegion(displacement, bounds);
  displacement.setAttribute('scale', String(shift.range * 2));
  const tintInset = all ? TINT_FEATHER : 0;
  setRegion(filter.querySelector('[result="body-tint"]')!, [
    left + tintInset,
    top + tintInset,
    width - 2 * tintInset,
    height - tintInset - (all ? TINT_FEATHER : 3),
  ]);
  setRegion(filter.querySelector('[result="tint-feathered"]')!, bounds);
  setRegion(filter.querySelector('[result="tint"]')!, bounds);
  setRegion(filter.querySelector('feBlend:last-child')!, bounds);
  glass.layer.style.setProperty('--glass-outset', `${REACH}px`);
  glass.layer.style.setProperty('--glass-filter', `url(#${filter.id})`);
  glass.layer.setAttribute('data-glass-active', '');
}
