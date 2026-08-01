import './app.css';
import { mount } from 'ilha';
import footer from './islands/footer.tsx';
import header from './islands/header.tsx';
import { initLocale } from './lib/locale.ts';
import automata from './pages/automata.tsx';

initLocale();
mount({
    automata,
    footer,
    header,
});
