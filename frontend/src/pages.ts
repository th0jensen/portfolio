import { createIsland, createIslandPageRenderer } from '@ilha/void/server';
import { islandPages } from './islands/pages.ts';

// Axum owns public routing. This manifest selects components inside its private
// NDJSON renderer; no Void HTTP server or build-time prerendering is involved.
export const pages = {
  '/': () => import('./pages/index.tsx'),
  '/experience': () => import('./pages/experience.tsx'),
  '/projects': () => import('./pages/projects.tsx'),
  '/projects/[slug]': () => import('./pages/projects/[slug].tsx'),
  '/error': () => import('./pages/error.tsx'),
  ...islandPages,
};

export const renderPage = createIslandPageRenderer({
  components: {
    layout: () => import('./pages/layout.tsx'),
    ...Object.fromEntries(
      Object.entries(pages).map(([id, load]) => [id, async () => {
        const page = await load();
        return {
          default: id in islandPages
            ? createIsland(page.default, { id, hydrate: 'load' })
            : page.default,
        };
      }]),
    ),
  },
  layoutTree: Object.fromEntries(Object.keys(pages).map((id) => [id, ['layout']])),
  // Every page has the interactive header and footer, but only islandPages
  // ship their page component to the browser.
  pagesNeedingClientJS: new Set(Object.keys(pages)),
  markdownScriptIds: new Set(),
});
