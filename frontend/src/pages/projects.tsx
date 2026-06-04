import ilha from 'ilha';
import type { Data, Project } from '../bindings';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
};

const ProjectCard = ({
  project,
  featured,
  visitLabel,
  appStoreLabel,
}: {
  project: Project;
  featured: boolean;
  visitLabel: string;
  appStoreLabel: string;
}) => {
  const techPills = Object.keys(project.technologies).map((tech) => (
    <span class='rounded-lg bg-accent/50 px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/70'>
      {tech}
    </span>
  ));

  const isAppStore = project.source_type === 'appstore';
  const isGithub = project.source_type === 'github';
  const hasSrc = !!project.source_link && !isAppStore;

  const title = hasSrc ? (
    <a
      href={project.source_link}
      class={`inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary/80 hover:underline ${
        featured ? 'text-lg md:text-2xl' : 'text-lg'
      }`}
      target='_blank'
      rel='noopener noreferrer'
    >
      {project.name}
    </a>
  ) : (
    <span
      class={`font-semibold text-foreground ${
        featured ? 'text-lg md:text-2xl' : 'text-lg'
      }`}
    >
      {project.name}
    </span>
  );

  const overlay = isAppStore ? (
    <div class='absolute inset-0 z-10 flex items-center justify-center bg-linear-to-b from-black/30 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
      <a
        href={project.source_link}
        target='_blank'
        rel='noopener noreferrer'
        aria-label={appStoreLabel}
      >
        <img
          src='/static/appstore.svg'
          alt={appStoreLabel}
          width='120'
          height='40'
        />
      </a>
    </div>
  ) : isGithub ? (
    <div class='absolute inset-0 z-10 flex items-center justify-center bg-linear-to-b from-black/30 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
      <a
        href={project.source_link}
        class='inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform hover:scale-105'
        target='_blank'
        rel='noopener noreferrer'
      >
        {visitLabel}
      </a>
    </div>
  ) : (
    <div class='absolute inset-0 z-10 bg-linear-to-b from-black/30 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
  );

  return (
    <div
      class={`group flex h-full overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-2xl transition-all duration-200 ease-in-out hover:shadow-[0_12px_28px_-5px_hsl(0_0%_0%_/0.12)] ${
        featured ? 'flex-col md:min-h-85 md:flex-row' : 'flex-col'
      }`}
    >
      <div
        class={
          featured
            ? 'overflow-hidden rounded-t-2xl md:w-[34%] md:shrink-0 md:rounded-l-2xl md:rounded-r-none md:rounded-tl-2xl md:rounded-tr-none'
            : 'overflow-hidden'
        }
      >
        <div
          class={
            featured
              ? 'relative flex items-center justify-center overflow-hidden bg-transparent h-50 md:h-full md:min-h-85 md:p-10'
              : 'relative flex h-50 items-center justify-center overflow-hidden bg-transparent'
          }
        >
          {overlay}

          <img
            src={project.image_url}
            alt={project.name}
            width='300'
            height='180'
            class={`object-contain transition-transform duration-500 ease-out group-hover:scale-105 ${
              featured ? 'h-45 md:h-58' : 'h-45'
            }`}
          />
        </div>
      </div>

      <div
        class={
          featured
            ? 'flex flex-1 flex-col gap-4 p-5 md:w-[66%] md:justify-center md:px-8 md:py-7'
            : 'flex flex-1 flex-col gap-4 p-5'
        }
      >
        {title}

        <p
          class={
            featured
              ? 'flex-1 whitespace-pre-line text-base leading-[1.65] text-muted-foreground md:max-w-2xl'
              : 'flex-1 whitespace-pre-line text-sm leading-[1.65] text-muted-foreground'
          }
        >
          {project.description}
        </p>

        <div class='flex flex-wrap gap-2 pt-1'>{techPills}</div>
      </div>
    </div>
  );
};

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
      <div class={i === 0 ? 'md:col-span-2' : ''}>
        <ProjectCard
          project={project}
          featured={i === 0}
          visitLabel={visitLabel}
          appStoreLabel={appStoreLabel}
        />
      </div>
    ));

    return (
      <section class='py-20' id='work'>
        <div class='mx-auto w-full max-w-6xl px-6'>
          <div class='mb-12'>
            <p class='mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
              {loc.work.subtitle}
            </p>

            <h2 class='text-[2.25rem] font-bold tracking-[-0.02em]'>
              {loc.nav.work}
            </h2>
          </div>

          <div class='grid grid-cols-1 gap-8 md:grid-cols-2'>{cards}</div>
        </div>
      </section>
    );
  });
