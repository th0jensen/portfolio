import './app.css';
import { mount } from 'ilha';
import footer from './islands/footer.tsx';
import header from './islands/header.tsx';
import { islandPages } from './islands/pages.ts';
import { initLocale } from './lib/locale.ts';

initLocale();
mount(document.querySelector('[data-island="header"]')!, header, {
  hydrate: true,
});
mount(document.querySelector('[data-island="footer"]')!, footer, {
  hydrate: true,
});

const pageHost = document.querySelector('#app > [data-ilha]');
const loadPage = islandPages[location.pathname];
if (pageHost && loadPage) {
  mount(pageHost, (await loadPage()).default, { hydrate: true });
}
