/**
 * Build-time SSR fragment script — invoked by build.rs via `bun run build`.
 * Outputs raw ilha SSR fragments to dist/prerendered/.
 */

import { loader } from '@ilha/router';
import Bun from 'bun';
import type { Data, ExperienceItem } from './bindings';

const { default: header } = await import('./islands/header');
const { default: footer } = await import('./islands/footer');
const { pageRouter, registry } = await import('../.ilha/routes');

const distDir = `${import.meta.dir}/../dist`;
const dataPath = `${import.meta.dir}/../../backend/data/data.json`;
const data = (await Bun.file(dataPath).json()) as Data;
const experience = data.experience_items as ExperienceItem[];

await Bun.$`mkdir -p ${distDir}/prerendered`;

// Header with hydration markers — Rust injects this into the page shell.
const headerHtml = await header.hydratable(
  { data },
  { name: 'header', as: 'div' },
);
await Bun.write(`${distDir}/prerendered/header.html`, headerHtml);
console.log('  fragment: header.html');

// Footer island — year is computed client-side after hydration.
const footerHtml = await footer.hydratable({}, { name: 'footer', as: 'div' });
await Bun.write(`${distDir}/prerendered/footer.html`, footerHtml);
console.log('  fragment: footer.html');

const routes = [
  { url: '/', name: 'index' },
  { url: '/projects', name: 'projects' },
  { url: '/experience', name: 'experience' },
  { url: '/contact', name: 'contact' },
  { url: '/error', name: 'error' },
] as const;

for (const route of routes) {
  if (route.name === 'error') continue;

  pageRouter.attachLoader(
    route.url,
    loader(async () =>
      route.name === 'experience' ? { data, experience } : { data },
    ),
  );
}

for (const route of routes) {
  const appHtml = await pageRouter.renderHydratable(route.url, registry, {
    snapshot: false,
  });
  await Bun.write(`${distDir}/prerendered/${route.name}.html`, appHtml);
  console.log(`  fragment: ${route.name}.html`);
}
