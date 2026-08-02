import './app.css';
import { mount } from 'ilha';
import footer from './islands/footer.tsx';
import header from './islands/header.tsx';
import { initLocale } from './lib/locale.ts';

initLocale();

if (document.querySelector('[data-ilha="automata"]')) {
  const { default: automata } = await import('./pages/automata.tsx');
  mount({ automata, footer, header });
} else if (document.querySelector('[data-ilha="contact"]')) {
  const { default: contact } = await import('./pages/contact.tsx');
  mount({ contact, footer, header });
} else {
  mount({ footer, header });
}
