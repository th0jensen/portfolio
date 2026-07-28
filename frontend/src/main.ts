import './app.css';
import { pageRouter, registry } from 'ilha:pages/server';
import { mount } from 'ilha';
import automaton_island from './islands/automaton_island';
import footer from './islands/footer';
import header from './islands/header';
import { initLocale } from './lib/locale';

initLocale();
mount({ automaton_island, header, footer });
// biome-ignore lint/style/noNonNullAssertion: #app is required by the app shell
const app = document.querySelector('#app')!;
pageRouter.hydrate(registry, { root: app, target: app });
