import { router } from '@ilha/router';
import automata from './pages/automata.tsx';
import contact from './pages/contact.tsx';
import errorPage from './pages/error.tsx';
import experience from './pages/experience.tsx';
import home from './pages/index.tsx';
import project from './pages/projects/[slug].tsx';
import projects from './pages/projects.tsx';

export const pageRouter = router()
  .route('/', home)
  .route('/automata', automata)
  .route('/contact', contact)
  .route('/error', errorPage)
  .route('/experience', experience)
  .route('/projects', projects)
  .route('/projects/:slug', project)
  .errorBoundary('/projects/:slug', () => errorPage);
