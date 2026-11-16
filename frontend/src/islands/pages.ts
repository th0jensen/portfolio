import type { IslandModule } from '@ilha/void/islands';

/**
 * Pages with live locale-dependent content or controls. The Void renderer wraps
 * these in snapshot-carrying islands so language changes update the SSR content
 * without reloading. Server and browser read this one lazy-loading table.
 */
export const islandPages: Record<string, () => Promise<IslandModule<never>>> = {
  '/': () => import('../pages/index.tsx'),
  '/experience': () => import('../pages/experience.tsx'),
  '/projects': () => import('../pages/projects.tsx'),
  '/projects/[slug]': () => import('../pages/projects/[slug].tsx'),
  '/automata': () => import('../pages/automata.tsx'),
  '/contact': () => import('../pages/contact.tsx'),
};
