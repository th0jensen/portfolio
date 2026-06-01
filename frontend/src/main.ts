import './app.css';
import { pageRouter } from 'ilha:pages';
import { registry } from 'ilha:registry';
import { mount } from 'ilha';
import footer from './islands/footer';
import header from './islands/header';
import { initLocale } from './lib/locale';

initLocale();
mount({ header, footer });
// biome-ignore lint/style/noNonNullAssertion: #app is required by the app shell
const app = document.querySelector('#app')!;
pageRouter.hydrate(registry, { root: app, target: app });
