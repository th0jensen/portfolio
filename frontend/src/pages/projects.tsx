import { LayerCard, Link } from 'areia';
import ilha from 'ilha';
import type { Data, Project } from '../bindings';
import type { Work } from '../bindings/Work';
import { cn } from '../lib/cn';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
};

const ProjectCard = ({
  project,
  featured,
  data,
}: {
  project: Project;
  featured: boolean;
  data: Work;
}) => {
  const techPills = Object.keys(project.technologies).map((tech) => (
    <span class='rounded-lg bg-accent/50 px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/70'>
      {tech}
    </span>
  ));

  const isAppStore = project.source_type === 'appstore';
  const isGithub = project.source_type === 'github';
  const overlayClass =
    'absolute inset-0 z-10 flex items-center justify-center bg-linear-to-b from-black/30 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100';

  const overlay = isAppStore ? (
    <div class={overlayClass}>
      <Link
        href={project.source_link}
        aria-label={data.download_app_store}
        external
      >
        <img
          src='/static/appstore.svg'
          alt={data.download_app_store}
          width='120'
          height='40'
        />
      </Link>
    </div>
  ) : isGithub ? (
    <div class={overlayClass}>
      <Link
        href={project.source_link}
        class='inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform hover:scale-105'
        external
      >
        {data.visit_project}
      </Link>
    </div>
  ) : (
    <div class={overlayClass} />
  );

  return (
    <div>
      <LayerCard
        class={cn(
          'group flex h-full overflow-hidden transition-all duration-200 ease-in-out hover:shadow-[0_12px_28px_-5px_hsl(0_0%_0%_/0.12)] flex-col',
          featured && 'md:min-h-85',
        )}
      >
        <LayerCard.Title>
          <Link
            class='text-muted-foreground hover:text-foreground no-underline hover:underline'
            href={project.source_link}
            external
          >
            {project.name}
          </Link>
        </LayerCard.Title>
        <LayerCard.Content
          class={cn('flex flex-col', featured && 'md:flex-row md:min-h-85')}
        >
          <div
            class={cn(
              'relative flex h-50 items-center justify-center overflow-hidden bg-transparent',
              featured &&
                'md:h-full md:min-h-85 md:p-10 md:w-[34%] md:shrink-0',
            )}
          >
            {overlay}
            <img
              src={project.image_url}
              alt={project.name}
              width='300'
              height='180'
              class={cn(
                'object-contain transition-transform duration-500 ease-out group-hover:scale-105 h-45',
                featured && 'md:5-58',
              )}
            />
          </div>
          <div
            class={cn(
              'flex flex-1 flex-col gap-4 p-5',
              featured && 'md:w-[66%] md:justify-center md:px-8 md:py-7',
            )}
          >
            <p
              class={cn(
                'whitespace-pre-line leading-[1.65] text-muted-foreground',
                featured ? 'md:max-w-2xl text-base' : 'flex-1 text-sm',
              )}
            >
              {project.description}
            </p>
            <div class='flex flex-wrap gap-2 pt-1'>{techPills}</div>
          </div>
        </LayerCard.Content>
      </LayerCard>
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
    if (!data) return <div>Failed to fetch data from backend.</div>;

    const loc = data[locale()];
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

          <div class='grid grid-cols-1 gap-8 md:grid-cols-2'>
            {data.projects.map((project, i) => (
              <div class={cn(i === 0 && 'md:col-span-2')}>
                <ProjectCard
                  project={project}
                  featured={i === 0}
                  data={loc.work}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  });
