import { Link, LinkButton } from 'areia';
import ilha from 'ilha';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide';
import type { Data, Project } from '../../bindings/index.ts';
import ProjectCard from '../../components/project-card.tsx';
import SectionHeader from '../../components/section-header.tsx';
import Icon from '../../lib/icon.tsx';
import { locale } from '../../lib/locale.ts';

type PageInput = {
  data: {
    project: Project;
    projects: Project[];
    en: Pick<Data['en'], 'nav' | 'work'>;
    no: Pick<Data['no'], 'nav' | 'work'>;
  };
};

const copy = {
  en: {
    back: 'All projects',
    overview: 'Overview',
    highlights: 'Highlights',
    stack: 'Stack',
    more: 'More projects',
    moreDescription: 'Other things built across Rust, native software, and the web.',
  },
  no: {
    back: 'Alle prosjekter',
    overview: 'Oversikt',
    highlights: 'Høydepunkter',
    stack: 'Teknologier',
    more: 'Flere prosjekter',
    moreDescription: 'Annet jeg har bygget i Rust, native programvare og på nett.',
  },
} as const;

export default ilha
  .input<PageInput>()
  .state('data', ({ data }) => data)
  .render(({ state }) => {
    const data = state.data();
    const { project, projects } = data;
    const loc = data[locale()];
    const text = copy[locale()];
    const isInternal = project.source_link.startsWith('/');
    const sourceLabel = project.source_type === 'appstore'
      ? 'App Store'
      : project.source_type === 'internal'
      ? 'Portfolio lab'
      : 'GitHub';
    const projectIndex = projects.findIndex((p) => p.slug === project.slug);
    const otherProjects = projects.filter((p) => p.slug !== project.slug);

    return (
      <section class='flex-1'>
        <header class='relative overflow-hidden border-b border-border py-16 sm:py-20'>
          <div class='technical-grid absolute inset-0 opacity-35' />
          <div class='absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--background)/0.98),hsl(var(--background)/0.78))]' />
          <div class='relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10'>
            <Link
              href='/projects'
              class='inline-flex items-center gap-2 text-sm font-bold text-muted-foreground no-underline transition-colors hover:text-primary'
            >
              <Icon node={ArrowLeft} size={14} />
              {text.back}
            </Link>

            <p class='mt-8 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
              /0{projectIndex + 1} / {sourceLabel}
            </p>
            <h1 class='mt-4 max-w-4xl text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[0.98] tracking-[-0.045em] text-foreground'>
              {project.name}
            </h1>
            <p class='mt-6 max-w-2xl text-lg leading-8 text-muted-foreground'>
              {project.description}
            </p>
          </div>
        </header>

        <div class='mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10'>
          <div class='grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14'>
            <div class='relative isolate flex items-center justify-center overflow-hidden border border-border bg-project-surface p-10 lg:p-12'>
              <div class='absolute inset-5 border border-foreground/5' />
              <img
                src={project.image_url}
                alt={`${project.name} project mark`}
                width='320'
                height='320'
                loading='eager'
                class='relative z-10 h-48 w-48 object-contain drop-shadow-[0_18px_30px_hsl(var(--shadow)/0.2)] sm:h-56 sm:w-56'
              />
            </div>

            <div class='flex flex-col'>
              <h2 class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                {text.overview}
              </h2>
              <p class='mt-4 max-w-2xl whitespace-pre-line text-[1.0625rem] leading-8 text-muted-foreground'>
                {project.overview}
              </p>

              {project.highlights.length > 0 && (
                <div class='mt-9'>
                  <h2 class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                    {text.highlights}
                  </h2>
                  <ul class='mt-4 space-y-3'>
                    {project.highlights.map((highlight) => (
                      <li class='flex items-start gap-3 text-[0.9375rem] leading-7 text-muted-foreground'>
                        <span class='mt-2.5 h-1.5 w-1.5 shrink-0 bg-primary' />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div class='mt-9'>
                <h2 class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                  {text.stack}
                </h2>
                <div class='mt-4 flex flex-wrap gap-x-5 gap-y-2'>
                  {Object.entries(project.technologies).map(([technology, color]) => (
                    <span class='inline-flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-widest text-muted-foreground'>
                      <span class='h-2 w-2 shrink-0' style={`background-color:${color}`} />
                      {technology}
                    </span>
                  ))}
                </div>
              </div>

              <LinkButton
                href={project.source_link}
                variant='primary'
                external={!isInternal}
                class='group mt-10 min-h-11 w-fit rounded-sm px-5 font-bold'
              >
                {project.source_type === 'appstore'
                  ? loc.work.download_app_store
                  : loc.work.visit_project}
                <Icon
                  node={isInternal ? ArrowRight : ArrowUpRight}
                  size={16}
                  class='transition-transform group-hover:translate-x-0.5'
                />
              </LinkButton>
            </div>
          </div>

          {otherProjects.length > 0 && (
            <div class='mt-20 border-t border-border pt-16 sm:mt-24 sm:pt-20'>
              <SectionHeader
                eyebrow={loc.nav.work}
                title={text.more}
                description={text.moreDescription}
              />
              <div class='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
                {otherProjects.map((p, index) => (
                  <ProjectCard
                    project={p}
                    index={index}
                    copy={loc.work}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  });
