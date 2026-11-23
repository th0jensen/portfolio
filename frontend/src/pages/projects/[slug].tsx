import type { Project } from '../../bindings/index.ts';
import { Link, LinkButton } from '../../components/link.tsx';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide';
import DotMatrix from '../../components/dot-matrix.tsx';
import ProjectCard from '../../components/project-card.tsx';
import SectionHeader from '../../components/section-header.tsx';
import Icon from '../../lib/icon.tsx';
import { useLocale } from '../../lib/locale.ts';
import { reveal, revealStagger } from '../../lib/motion.ts';
import { useServerData } from '../../lib/server-data.ts';

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

export default function ProjectDetails({ project }: { project: Project }) {
  const { data } = useServerData((value) => value);
  const projects = data.projects;
  const locale = useLocale()();
  const loc = data[locale];
  const text = copy[locale];
  const isInternal = project.source_link.startsWith('/');
  const sourceLabel = project.source_type === 'appstore'
    ? 'App Store'
    : project.source_type === 'internal'
    ? 'Portfolio lab'
    : 'GitHub';
  const projectIndex = projects.findIndex((p) => p.slug === project.slug);
  const otherProjects = projects.filter((p) => p.slug !== project.slug);

  return (
    <section class='card-landscape flex-1'>
      <header class='relative isolate -mt-16 overflow-hidden border-b border-border pt-32 pb-16 sm:pt-36 sm:pb-20'>
        <DotMatrix mode='field' spacing={14} />
        <div class='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--background))_0%,hsl(var(--background)/0.94)_38%,hsl(var(--background)/0.55)_72%,hsl(var(--background)/0.2)_100%)]' />
        <div class='relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10'>
          <Link
            href='/projects'
            class='inline-flex items-center gap-2 text-sm font-bold text-muted-foreground no-underline transition-colors hover:text-primary'
          >
            <Icon node={ArrowLeft} size={14} />
            {text.back}
          </Link>

          <p
            class='mt-8 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'
            data-scramble
            {...reveal}
          >
            {`/0${projectIndex + 1} / ${sourceLabel}`}
          </p>
          <h1
            class='mt-4 max-w-4xl text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[0.98] tracking-[-0.045em] text-foreground'
            data-reveal='lines'
            data-morph-preserve='data-revealed'
          >
            <span class='reveal-line'>
              <span>{project.name}</span>
            </span>
          </h1>
          <p class='mt-6 max-w-2xl text-lg leading-8 text-muted-foreground' {...reveal}>
            {project.description}
          </p>
        </div>
      </header>

      <div class='mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10'>
        <div class='grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14'>
          <div
            data-spotlight
            class='glass-card spotlight flex items-center justify-center p-10 lg:p-12'
          >
            <div
              aria-hidden='true'
              class='glass-lens'
              data-morph-preserve='style data-glass-active'
            />
            <DotMatrix mode='field' spacing={10} fade={0} lens={130} class='z-0 opacity-45' />
            <div class='absolute inset-5 z-[1] border border-foreground/5' />
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
                <ul class='mt-4 space-y-3' {...revealStagger}>
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
              <div class='mt-4 flex flex-wrap gap-2'>
                {Object.entries(project.technologies).map(
                  ([technology, color]) => (
                    <span class='inline-flex items-center gap-2 border border-border bg-card px-2.5 py-1.5 font-mono text-[0.6875rem] uppercase leading-none tracking-widest text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground'>
                      <span
                        class='h-2 w-2 shrink-0'
                        style={`background-color:${color}`}
                      />
                      {technology}
                    </span>
                  ),
                )}
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
            <div
              class='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'
              {...revealStagger}
            >
              {otherProjects.map((p, index) => (
                <div class='h-full'>
                  <ProjectCard project={p} index={index} copy={loc.work} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
