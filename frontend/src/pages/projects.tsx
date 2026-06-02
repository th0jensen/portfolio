import ilha from 'ilha';
import type { Data, Project } from '../bindings';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
};

function projectCard(
  project: Project,
  featured: boolean,
  visitLabel: string,
  appStoreLabel: string,
) {
  const featuredClass = featured ? ' project-card--featured' : '';

  const techPills = Object.keys(project.technologies).map((tech) => (
    <span class='tech-pill'>{tech}</span>
  ));

  const isAppStore = project.source_type === 'appstore';
  const isGithub = project.source_type === 'github';
  const hasSrc = !!project.source_link && !isAppStore;

  const title = hasSrc ? (
    <a
      href={project.source_link}
      class='project-card__name'
      target='_blank'
      rel='noopener noreferrer'
    >
      {project.name}
    </a>
  ) : (
    <span class='project-card__name'>{project.name}</span>
  );

  const overlay = isAppStore ? (
    <div class='project-card__overlay'>
      <a
        href={project.source_link}
        class='project-card__overlay-appstore'
        target='_blank'
        rel='noopener noreferrer'
        aria-label={appStoreLabel}
      >
        <img
          src='/static/appstore.svg'
          alt={appStoreLabel}
          width='120'
          height='40'
          class='project-card__appstore-badge'
        />
      </a>
    </div>
  ) : isGithub ? (
    <div class='project-card__overlay'>
      <a
        href={project.source_link}
        class='project-card__overlay-cta'
        target='_blank'
        rel='noopener noreferrer'
      >
        ${visitLabel}
      </a>
    </div>
  ) : (
    <div class='project-card__overlay'></div>
  );

  return (
    <div class={`glass-card project-card smooth-transition ${featuredClass}`}>
      <div class='project-card__media-wrap'>
        <div class='project-card__media'>
          {overlay}
          <img
            src={project.image_url}
            alt={project.name}
            class='project-card__img'
            width='300'
            height='180'
          />
        </div>
      </div>
      <div class='project-card__body'>
        {title}
        <p class='project-card__desc'>{project.description}</p>
        <div class='tech-pills'>{techPills}</div>
      </div>
    </div>
  );
}

export default ilha
  .state('data', ({ data }: PageInput) => data ?? null)
  .effect(({ state }) => {
    if (state.data()) return;
    (async () => {
      try {
        const result = await api.data.query();
        state.data(result);
      } catch {}
    })();
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return <div></div>;

    const loc = data[locale()];
    const visitLabel =
      loc.work.visit_project.replace('{name}', '').trim() || 'View project';
    const appStoreLabel = loc.work.download_app_store;

    const cards = data.projects.map((project, i) => (
      <div class={i === 0 ? 'project-grid__item--featured' : ''}>
        {projectCard(project, i === 0, visitLabel, appStoreLabel)}
      </div>
    ));

    return (
      <section class='section' id='work'>
        <div class='container'>
          <div class='section-header'>
            <p class='section-eyebrow'>{loc.work.subtitle}</p>
            <h2 class='section-title section-title--lg'>{loc.nav.work}</h2>
          </div>
          <div class='project-grid'>{cards}</div>
        </div>
      </section>
    );
  });
