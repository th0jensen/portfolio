import type { Component } from 'ilha';

/**
 * Pages that keep running in the browser, loaded lazily so every other route ships no
 * page JS. `render.ts` snapshots exactly these — a page hydrated without its snapshot
 * reads `undefined` server data — so both sides read this one table.
 */
export const islandPages: Record<string, () => Promise<{ default: Component }>> = {
  '/automata': () => import('../pages/automata.tsx'),
  '/contact': () => import('../pages/contact.tsx'),
};
