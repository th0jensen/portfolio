import './app.css';
import { mountIsland } from '@ilha/void/islands';
import type { IslandModule } from '@ilha/void/islands';
import type { JsonRecord } from '@ilha/void';
import { initIslands } from 'void/pages-client';
import { islandPages } from './islands/pages.ts';
import { initDotMatrix } from './lib/dot-matrix.ts';
import { initLocale } from './lib/locale.ts';
import { initMotion } from './lib/motion.ts';

initLocale();
initMotion();
initDotMatrix();
initIslands({
  header: () => import('./islands/header.tsx'),
  footer: () => import('./islands/footer.tsx'),
  ...islandPages,
}, (el, module, props) => {
  mountIsland(el as HTMLElement, module as IslandModule<JsonRecord>, props as JsonRecord);
});
