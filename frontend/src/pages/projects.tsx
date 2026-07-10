import ilha from 'ilha';
import type { Data } from '../bindings';
import ProjectCard from '../components/project-card';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
};

export default ilha
  .state('data', ({ data }: PageInput) => data ?? null)
  .effect(({ state }) => {
    if (state.data()) return;
    (async () => {
      try {
        state.data(await api.data.query());
      } catch {}
    })();
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return '';

    const loc = data[locale()];
    const isNorwegian = locale() === 'no';
    const featuredProject = data.projects[1];
    const secondaryProjects = [data.projects[0], data.projects[2]];

    return (
      <section id='work' class='flex-1'>
        <header class='relative overflow-hidden border-b border-border py-16 sm:py-20'>
          <div class='technical-grid absolute inset-0 opacity-35' />
          <div class='absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--background)/0.98),hsl(var(--background)/0.78))]' />
          <div class='relative mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:items-end lg:px-10'>
            <div>
              <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                01 / {loc.work.subtitle}
              </p>
              <h1 class='mt-4 text-5xl font-bold tracking-[-0.055em] sm:text-6xl'>
                {loc.nav.work}
              </h1>
            </div>
            <p class='max-w-2xl text-lg leading-8 text-muted-foreground md:justify-self-end'>
              {isNorwegian
                ? 'Systemarbeid, native verktøy og produkter — fra bidrag til Zed til programvare bygget og levert fra bunnen av.'
                : 'Systems work, native tooling, and products—from contributions to Zed to software built and shipped from the ground up.'}
            </p>
          </div>
        </header>

        <div class='mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10'>
          <div class='grid grid-cols-1 gap-5'>
            <ProjectCard
              project={featuredProject}
              index={0}
              featured
              copy={loc.work}
            />
            <div class='grid grid-cols-1 gap-5 md:grid-cols-2'>
              {secondaryProjects.map((project, index) => (
                <ProjectCard
                  project={project}
                  index={index + 1}
                  copy={loc.work}
                />
              ))}
            </div>
          </div>

          <div class='mt-16 grid border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-border'>
            {[
              ['Rust', 'Systems'],
              ['GPUI', 'Native UI'],
              ['Swift', 'Apple platforms'],
            ].map(([technology, context]) => (
              <div class='flex items-center justify-between gap-4 py-5 sm:px-6 first:sm:pl-0 last:sm:pr-0'>
                <span class='text-base font-bold'>{technology}</span>
                <span class='font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                  {context}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  });
