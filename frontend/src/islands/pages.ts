import type { Component } from 'ilha';

/**
 * Pages that keep running in the browser, loaded lazily so every other route ships no
 * page JS. The Void renderer wraps exactly these in snapshot-carrying islands,
 * so server and browser read this one table.
 */
export const islandPages: Record<string, () => Promise<{ default: Component }>> = {
  '/automata': () => import('../pages/automata.tsx'),
  '/contact': () => import('../pages/contact.tsx'),
};
