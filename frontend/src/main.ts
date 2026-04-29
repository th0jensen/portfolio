import './app.css';
import { mount } from 'ilha';
import { pageRouter } from 'ilha:pages';
import { registry } from 'ilha:registry';
import { initLocale } from './lib/locale';
import header from './islands/header';
import footer from './islands/footer';

initLocale();
mount({ header, footer });
const app = document.querySelector('#app')!;
pageRouter.hydrate(registry, { root: app, target: app });
