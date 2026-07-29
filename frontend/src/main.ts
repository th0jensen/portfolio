import './app.css';
import { mount } from 'ilha';
import automaton_island from './islands/automaton_island.tsx';
import footer from './islands/footer.tsx';
import header from './islands/header.tsx';
import { initLocale } from './lib/locale.ts';
// import automata from './pages/automata.tsx';
// import contact from './pages/contact.tsx';
// import error from './pages/error.tsx';
// import experience from './pages/experience.tsx';
// import index from './pages/index.tsx';
// import projects from './pages/projects.tsx';

initLocale();
mount({
    // automata,
    automaton_island,
    // contact,
    // error,
    // experience,
    footer,
    header,
    // index,
    // projects,
});
