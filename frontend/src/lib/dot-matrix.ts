/**
 * Canvas dot-matrix surfaces. Server-rendered markup carries
 * `<canvas data-dot-matrix="…">`; the browser attaches one engine per canvas
 * and a single shared animation loop draws the ones on screen.
 *
 * Modes:
 * - `field`: resting dot texture with a pointer spotlight and click ripples.
 * - `image`: halftone of `data-src` that covers the photo beneath it while
 *   it develops on load, under the pointer lens, and as it scrolls away.
 * - `morph`: scroll-scrubbed morph between `data-shapes` (gear, window,
 *   phone, glider, or a glyph), driven by the
 *   nearest `[data-scroll-scene]` ancestor.
 * - `text`: halftone of `data-text`, swept in from the left on reveal.
 */

type Mode = 'field' | 'image' | 'morph' | 'text';
type Rgb = readonly [number, number, number];
type Palette = { fg: Rgb; primary: Rgb; bg: Rgb; dark: boolean };

type Engine = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  mode: Mode;
  spacing: number;
  cols: number;
  rows: number;
  width: number;
  height: number;
  /** Per-cell target value in [0, 1] for image, text, and each morph shape. */
  masks: Float32Array[];
  /** Per-cell stable random in [0, 1). */
  seed: Float32Array;
  ripples: { x: number; y: number; start: number }[];
  born: number;
  revealed: number;
  visible: boolean;
  image?: HTMLImageElement;
  /** morph: the scene progress on screen, eased toward `morphTarget`. */
  morphShown?: number;
  morphTarget?: number;
};

const engines = new Map<HTMLCanvasElement, Engine>();
const pointer = { x: -1e4, y: -1e4, active: false };
/** When the page last scrolled; the morph snaps to a shape once it rests. */
const scroll = { at: 0 };
let palette: Palette | undefined;
let frame = 0;
let reducedMotion = false;
let observer: IntersectionObserver | undefined;

const SELECTOR = 'canvas[data-dot-matrix]';
// Retain the load transition and hover lens for later; keep both off together.
const IMAGE_INTRO_ENABLED = false;

/** The on-screen pitch, including any CSS stretch since the canvas was drawn. */
export function fieldGrid(canvas: HTMLCanvasElement) {
  const engine = engines.get(canvas);
  if (engine?.mode !== 'field' || !engine.cols || !engine.rows) return;
  const rect = canvas.getBoundingClientRect();
  return { rect, pitchX: rect.width / engine.cols, pitchY: rect.height / engine.rows };
}

export function initDotMatrix(): void {
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const engine = engines.get(entry.target as HTMLCanvasElement);
      if (!engine) continue;
      engine.visible = entry.isIntersecting;
      if (engine.visible && !engine.revealed) engine.revealed = performance.now();
    }
    schedule();
  }, { rootMargin: '120px 0px' });

  globalThis.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = event.pointerType === 'mouse' || event.pointerType === 'pen';
    schedule();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    pointer.active = false;
    schedule();
  });
  document.addEventListener('pointerdown', (event) => {
    if (reducedMotion) return;
    for (const engine of engines.values()) {
      if (engine.mode !== 'field' || !engine.visible) continue;
      const rect = engine.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) continue;
      engine.ripples.push({ x, y, start: performance.now() });
    }
    schedule();
  }, { passive: true });
  globalThis.addEventListener('scroll', () => {
    scroll.at = performance.now();
    schedule();
  }, { passive: true });
  globalThis.addEventListener('resize', () => {
    for (const engine of engines.values()) resize(engine);
    // A resized canvas is blank; repaint now rather than a frame later.
    cancelAnimationFrame(frame);
    tick(performance.now());
  }, { passive: true });

  new MutationObserver(() => {
    palette = undefined;
    for (const engine of engines.values()) {
      if (engine.mode === 'image') sampleImage(engine);
    }
    schedule();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // Islands re-render on locale changes, replacing canvases.
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
  document.fonts?.ready.then(() => {
    for (const engine of engines.values()) {
      if (engine.mode === 'text') sampleMasks(engine);
    }
    schedule();
  });
}

function scan(): void {
  for (const [canvas, engine] of engines) {
    if (!canvas.isConnected) {
      observer?.unobserve(canvas);
      engines.delete(canvas);
      void engine;
    }
  }
  for (const canvas of document.querySelectorAll<HTMLCanvasElement>(SELECTOR)) {
    if (engines.has(canvas)) continue;
    const context = canvas.getContext('2d');
    if (!context) continue;
    const engine: Engine = {
      canvas,
      context,
      mode: (canvas.dataset.dotMatrix as Mode) || 'field',
      spacing: Number(canvas.dataset.spacing) || 12,
      cols: 0,
      rows: 0,
      width: 0,
      height: 0,
      masks: [],
      seed: new Float32Array(0),
      ripples: [],
      born: performance.now(),
      revealed: 0,
      visible: false,
    };
    engines.set(canvas, engine);
    resize(engine);
    if (engine.mode === 'image') loadImage(engine);
    observer?.observe(canvas);
  }
  schedule();
}

function resize(engine: Engine): void {
  const rect = engine.canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const spacing = rect.width < 480 ? engine.spacing * 0.8 : engine.spacing;
  const cols = Math.ceil(rect.width / spacing);
  const rows = Math.ceil(rect.height / spacing);
  // Mobile browsers fire resize as the address bar moves; resizing a canvas
  // clears it, so leave it alone unless its box really changed.
  if (rect.width === engine.width && rect.height === engine.height) return;
  engine.canvas.width = Math.round(rect.width * dpr);
  engine.canvas.height = Math.round(rect.height * dpr);
  engine.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  const changed = cols !== engine.cols || rows !== engine.rows;
  engine.width = rect.width;
  engine.height = rect.height;
  engine.cols = cols;
  engine.rows = rows;
  if (!changed) return;
  engine.seed = new Float32Array(cols * rows);
  for (let i = 0; i < engine.seed.length; i++) engine.seed[i] = hash(i);
  sampleMasks(engine);
}

function sampleMasks(engine: Engine): void {
  if (engine.mode === 'image') return sampleImage(engine);
  if (engine.mode === 'morph') {
    const shapes = (engine.canvas.dataset.shapes ?? '').split(',').filter(Boolean);
    engine.masks = shapes.map((shape) =>
      rasterize(engine, (ctx, w, h) => drawShape(ctx, shape, w, h))
    );
  }
  if (engine.mode === 'text') {
    const text = engine.canvas.dataset.text ?? '';
    engine.masks = [rasterize(engine, (ctx, w, h) => {
      let size = h * 0.92;
      ctx.font = `700 ${size}px Alef, ui-sans-serif, system-ui, sans-serif`;
      const measured = ctx.measureText(text).width;
      if (measured > w * 0.98) size *= (w * 0.98) / measured;
      ctx.font = `700 ${size}px Alef, ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h * 0.54);
    })];
  }
}

/** Draws at 4× the grid and averages each cell's alpha into its coverage. */
function rasterize(
  engine: Engine,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): Float32Array {
  const scale = 4;
  const w = engine.cols * scale;
  const h = engine.rows * scale;
  const out = new Float32Array(engine.cols * engine.rows);
  if (w === 0 || h === 0) return out;
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return out;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  draw(ctx, w, h);
  const pixels = ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[((y / scale) | 0) * engine.cols + ((x / scale) | 0)] += pixels[(y * w + x) * 4 + 3];
    }
  }
  const area = scale * scale * 255;
  for (let i = 0; i < out.length; i++) out[i] /= area;
  return out;
}

function drawShape(ctx: CanvasRenderingContext2D, shape: string, w: number, h: number): void {
  const s = Math.min(w, h) * 0.8;
  const cx = w / 2;
  const cy = h / 2;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  if (shape === 'gear') {
    // Rust: toothed ring around a hub.
    const outer = s * 0.46;
    const ring = s * 0.36;
    const teeth = 16;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? outer : ring;
      const a2 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
    }
    ctx.closePath();
    ctx.moveTo(cx + s * 0.24, cy);
    ctx.arc(cx, cy, s * 0.24, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.font = `700 ${s * 0.3}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R', cx, cy + s * 0.01);
  } else if (shape === 'window') {
    // Native UI: an app window with a sidebar and editor lines.
    const ww = s * 1.15;
    const wh = s * 0.82;
    const x = cx - ww / 2;
    const y = cy - wh / 2;
    const line = Math.max(2, s * 0.035);
    ctx.lineWidth = line;
    ctx.strokeRect(x, y, ww, wh);
    ctx.fillRect(x, y, ww, wh * 0.14);
    ctx.fillRect(x + ww * 0.27, y + wh * 0.14, line, wh * 0.86);
    for (let i = 0; i < 6; i++) {
      const lw = [0.5, 0.32, 0.42, 0.22, 0.46, 0.3][i];
      ctx.fillRect(x + ww * 0.34, y + wh * (0.27 + i * 0.11), ww * lw, line * 1.6);
      ctx.fillRect(x + ww * 0.06, y + wh * (0.27 + i * 0.11), ww * 0.14, line * 1.6);
    }
  } else if (shape === 'phone') {
    // Apple platforms: a phone with a notch and a grid of app icons.
    const pw = s * 0.52;
    const ph = s * 1.02;
    const x = cx - pw / 2;
    const y = cy - ph / 2;
    const line = Math.max(2, s * 0.035);
    ctx.lineWidth = line;
    ctx.beginPath();
    ctx.roundRect(x, y, pw, ph, pw * 0.16);
    ctx.stroke();
    ctx.fillRect(cx - pw * 0.18, y + ph * 0.035, pw * 0.36, ph * 0.04);
    const icon = pw * 0.17;
    const gap = (pw - icon * 4) / 5;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillRect(
          x + gap + col * (icon + gap),
          y + ph * 0.15 + row * (icon + gap * 1.6),
          icon,
          icon,
        );
      }
    }
    ctx.fillRect(cx - pw * 0.2, y + ph * 0.92, pw * 0.4, line);
  } else if (shape === 'glider') {
    // Automata: Conway's glider.
    const cell = s / 3.4;
    const ox = cx - cell * 1.5;
    const oy = cy - cell * 1.5;
    for (const [gx, gy] of [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]]) {
      ctx.fillRect(
        ox + gx * cell + cell * 0.08,
        oy + gy * cell + cell * 0.08,
        cell * 0.84,
        cell * 0.84,
      );
    }
  } else {
    ctx.font = `700 ${s * 0.9}px Alef, ui-sans-serif, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shape, cx, cy);
  }
}

function loadImage(engine: Engine): void {
  const src = engine.canvas.dataset.src;
  if (!src) return;
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    engine.image = image;
    sampleImage(engine);
    schedule();
  };
  image.src = src;
}

function sampleImage(engine: Engine): void {
  const image = engine.image;
  if (!image || engine.cols === 0) return;
  const { cols, rows } = engine;
  const offscreen = document.createElement('canvas');
  offscreen.width = cols;
  offscreen.height = rows;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  // object-fit: cover, honoring the element's object-position y.
  const focusY = Number(engine.canvas.dataset.focusY ?? 0.5);
  const scale = Math.max(cols / image.naturalWidth, rows / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.drawImage(image, (cols - dw) / 2, (rows - dh) * focusY, dw, dh);
  const pixels = ctx.getImageData(0, 0, cols, rows).data;
  const mask = new Float32Array(cols * rows);
  const dark = colors().dark;
  for (let i = 0; i < mask.length; i++) {
    const lum = (0.2126 * pixels[i * 4] + 0.7152 * pixels[i * 4 + 1] + 0.0722 * pixels[i * 4 + 2]) /
      255;
    const tone = dark ? lum : 1 - lum;
    mask[i] = Math.min(1, Math.max(0, (tone - 0.08) * 1.35));
  }
  engine.masks = [mask];
}

function schedule(): void {
  if (!frame) frame = requestAnimationFrame(tick);
}

function tick(now: number): void {
  frame = 0;
  let animating = false;
  for (const engine of engines.values()) {
    if (!engine.visible || engine.cols === 0) continue;
    if (draw(engine, now)) animating = true;
  }
  if (animating && !reducedMotion) schedule();
}

/** Draws one frame; returns whether the surface still needs animating. */
function draw(engine: Engine, now: number): boolean {
  const { context: ctx, cols, rows, width, height } = engine;
  const pal = colors();
  const rect = engine.canvas.getBoundingClientRect();
  const spacing = width / cols;
  const rowSpacing = height / rows;
  const px = pointer.active ? pointer.x - rect.left : -1e4;
  const py = pointer.active ? pointer.y - rect.top : -1e4;
  const lensRadius = Number(engine.canvas.dataset.lens) || 140;
  const dot = spacing * (engine.mode === 'field' ? 0.5 : 0.62);
  const pointerHeight = engine.mode === 'field'
    ? fieldHeight(px / spacing - 0.5, py / rowSpacing - 0.5)
    : 0;

  ctx.clearRect(0, 0, width, height);
  let busy = false;

  // Scroll progress: element top at viewport bottom → 0, bottom at top → 1.
  const vh = innerHeight;
  const scene = engine.canvas.closest<HTMLElement>('[data-scroll-scene]');
  const sceneRect = scene?.getBoundingClientRect();
  const sceneProgress = sceneRect
    ? clamp(-sceneRect.top / Math.max(1, sceneRect.height - vh), 0, 1)
    : 0;
  const exit = clamp(-rect.top / Math.max(1, rect.height), 0, 1);
  const morph = engine.mode === 'morph' ? settleMorph(engine, sceneProgress, now) : 0;
  // Keep drawing until the scene has rested long enough to snap to a shape.
  if (engine.mode === 'morph' && (morph !== engine.morphTarget || now - scroll.at <= 160)) {
    busy = true;
  }

  const ripples = engine.ripples.filter((r) => now - r.start < 1600);
  engine.ripples = ripples;
  const rippleHeights = ripples.map((r) =>
    fieldHeight(r.x / spacing - 0.5, r.y / rowSpacing - 0.5)
  );
  if (ripples.length) busy = true;

  const introAge = engine.revealed ? (now - engine.revealed) / 1000 : 0;
  // Keep the loop alive through the delay before the first scanline moves.
  if (
    IMAGE_INTRO_ENABLED && engine.mode === 'image' && engine.revealed && introAge < 1.5 &&
    !reducedMotion
  ) {
    busy = true;
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const x = col * spacing + spacing / 2;
      const y = row * rowSpacing + rowSpacing / 2;
      const seed = engine.seed[i];
      const dx = x - px;
      const dy = y - py;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const glow = engine.mode === 'field'
        ? 0
        : Math.exp(-(distance * distance) / (2 * lensRadius * lensRadius * 0.35));

      let value = 0;
      let tint = 0;
      let cover = 0;
      let offsetX = 0;
      let offsetY = 0;

      if (engine.mode === 'field') {
        const fade = Number(engine.canvas.dataset.fade ?? 1);
        const nx = col / cols;
        const ny = row / rows;
        // A fixed resting texture; only the pointer and clicks disturb it.
        const wave = fieldHeight(col, row);
        // Project the lens onto the same relief as the resting dots. Relative
        // height bends its footprint around ridges while keeping it anchored
        // to the pointer; depth softens the light on the far side of a slope.
        const relief = (wave - pointerHeight) * lensRadius * 1.1;
        const fieldGlow = Math.exp(
          -fieldDistanceSquared(dx, dy, relief) /
            (2 * lensRadius * lensRadius * 0.35),
        );
        const falloff = fade ? clamp(1.25 - Math.hypot(nx - 0.82, ny - 0.4) * 1.5, 0, 1) : 1;
        value = (0.03 + wave * wave * wave * 0.62) * falloff;
        value += fieldGlow * (0.12 + wave * wave * 1.2);
        tint = fieldGlow;
        let disturbance = fieldGlow;
        for (let r = 0; r < ripples.length; r++) {
          const ripple = ripples[r];
          const age = (now - ripple.start) / 1000;
          const radius = age * 520;
          const relief = (wave - rippleHeights[r]) * lensRadius * 1.1;
          const d = Math.sqrt(
            fieldDistanceSquared(x - ripple.x, y - ripple.y, relief),
          ) - radius;
          const ring = Math.exp(-(d * d) / 900) * (1 - age / 1.6);
          value += ring;
          tint = Math.max(tint, ring);
          disturbance = Math.max(disturbance, ring);
        }
        if (!reducedMotion && disturbance > 0.001) {
          // Shift along the contour, not outward from the cursor: nearby
          // grid lines bend around the terrain without moving the landscape.
          const slopeX = fieldHeight(col + 1, row) - wave;
          const slopeY = fieldHeight(col, row + 1) - wave;
          offsetX = -slopeY * disturbance * spacing * 3;
          offsetY = slopeX * disturbance * rowSpacing * 3;
        }
      } else if (engine.mode === 'image') {
        const tone = engine.masks[0]?.[i] ?? 0;
        // Develop: dots cover the photo, then a scanline uncovers it top-down.
        const scan = reducedMotion ? 2 : (introAge - 0.5) * 1.4 - row / rows;
        const intro = !IMAGE_INTRO_ENABLED
          ? 0
          : engine.revealed
          ? 1 - smoothstep(-0.12, 0.12, scan - seed * 0.15)
          : 1;
        const lens = IMAGE_INTRO_ENABLED
          ? 1 - smoothstep(lensRadius * 0.55, lensRadius, distance)
          : 0;
        const dissolve = smoothstep(seed * 0.7, seed * 0.7 + 0.3, exit * 1.6);
        cover = Math.max(intro, lens, dissolve);
        if (cover <= 0.001) continue;
        value = 0.06 + tone * 0.94;
        tint = lens * (1 - lens) * 2.4;
        if (intro > 0.001 && intro < 0.999) busy = true;
      } else if (engine.mode === 'morph') {
        const masks = engine.masks;
        if (masks.length === 0) continue;
        const segments = masks.length - 1;
        const position = morph * segments;
        const index = Math.min(segments, Math.floor(position));
        const from = masks[index][i];
        const to = masks[Math.min(segments, index + 1)][i];
        // Past the last shape there is nothing left to morph toward.
        const local = index >= segments ? 0 : clamp((position - index) * 1.8 - seed * 0.8, 0, 1);
        const eased = local * local * (3 - 2 * local);
        value = 0.06 + (from + (to - from) * eased) * 0.94;
        const flight = Math.sin(eased * Math.PI);
        tint = Math.max(flight * Math.abs(to - from), glow * 0.9);
        value += glow * 0.35;
        offsetX = Math.sin(seed * 40) * flight * spacing * 1.8;
        offsetY = Math.cos(seed * 40) * flight * spacing * 1.8;
      } else {
        const coverage = engine.masks[0]?.[i] ?? 0;
        const sweep = reducedMotion ? 2 : introAge * 1.3 - col / cols - seed * 0.25;
        const shown = engine.revealed ? smoothstep(0, 0.2, sweep) : 0;
        if (shown < 1) busy = true;
        value = (0.05 + coverage * 0.95) * shown + glow * 0.4 * coverage;
        tint = Math.max(glow * coverage, (1 - shown) * coverage);
      }

      if (cover > 0) {
        ctx.globalAlpha = cover;
        ctx.fillStyle = rgb(pal.bg);
        ctx.fillRect(col * spacing, row * rowSpacing, spacing + 0.5, rowSpacing + 0.5);
      }

      value = clamp(value, 0, 1);
      if (value < 0.02) continue;
      const field = engine.mode === 'field';
      const size = dot * (field ? 0.45 + 0.55 * value : 0.35 + 0.65 * Math.sqrt(value));
      const alpha = (cover || 1) * (field ? 0.1 + 0.9 * value : 0.16 + 0.84 * value);
      const left = x - size / 2 + offsetX;
      const top = y - size / 2 + offsetY;
      tint = clamp(tint, 0, 1);
      if (tint < 0.98) {
        ctx.globalAlpha = alpha * (1 - tint);
        ctx.fillStyle = rgb(pal.fg);
        ctx.fillRect(left, top, size, size);
      }
      if (tint > 0.02) {
        ctx.globalAlpha = alpha * tint;
        ctx.fillStyle = rgb(pal.primary);
        ctx.fillRect(left, top, size, size);
      }
    }
  }
  ctx.globalAlpha = 1;
  return busy;
}

/**
 * Follows the scroll while it moves; once it rests, eases to the nearest whole
 * shape so the scene never stops between two of them.
 */
function settleMorph(engine: Engine, progress: number, now: number): number {
  const segments = Math.max(1, engine.masks.length - 1);
  const resting = now - scroll.at > 160;
  const target = resting ? Math.round(progress * segments) / segments : progress;
  const shown = engine.morphShown ?? target;
  const next = reducedMotion || Math.abs(target - shown) < 0.0005
    ? target
    : shown + (target - shown) * (resting ? 0.12 : 0.35);
  engine.morphShown = next;
  engine.morphTarget = target;
  return next;
}

function colors(): Palette {
  if (palette) return palette;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => hslToRgb(style.getPropertyValue(name));
  palette = {
    fg: read('--foreground'),
    primary: read('--primary'),
    bg: read('--card'),
    dark: document.documentElement.classList.contains('dark'),
  };
  return palette;
}

const rgbCache = new Map<Rgb, string>();
function rgb(color: Rgb): string {
  let value = rgbCache.get(color);
  if (!value) {
    value = `rgb(${color[0]} ${color[1]} ${color[2]})`;
    rgbCache.set(color, value);
  }
  return value;
}

function hslToRgb(value: string): Rgb {
  const [h, s, l] = value.trim().split(/\s+/).map((part) => parseFloat(part));
  const sat = (s || 0) / 100;
  const light = (l || 0) / 100;
  const k = (n: number) => (n + (h || 0) / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Shared projection for hover light and click waves travelling over the field. */
function fieldDistanceSquared(dx: number, dy: number, relief: number): number {
  const x = dx + relief;
  const y = dy - relief * 0.6;
  return x * x + y * y + relief * relief * 0.35;
}

/** The single height map used by the resting field, pointer lens, and click waves. */
function fieldHeight(col: number, row: number): number {
  return 0.5 +
    0.5 * Math.sin(col * 0.21 + Math.sin(row * 0.13) * 2.5) * Math.cos(row * 0.17);
}

function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
