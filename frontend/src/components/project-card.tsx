import DotMatrix from './dot-matrix.tsx';
import { Link } from './link.tsx';
import { ArrowRight, ArrowUpRight } from 'lucide';
import type { Project } from '../bindings/index.ts';
import type { Work } from '../bindings/Work.ts';
import { cn } from '../lib/cn.ts';
import Icon from '../lib/icon.tsx';
import { useLocale } from '../lib/locale.ts';

type Props = {
  project: Project;
  index: number;
  featured?: boolean;
  headingLevel?: 2 | 3;
  copy: Work;
};

export default function ProjectCard(
  { project, index, featured = false, headingLevel = 3, copy }: Props,
) {
  const isInternal = project.source_link.startsWith('/');
  const sourceLabel = project.source_type === 'appstore'
    ? 'App Store'
    : project.source_type === 'internal'
    ? 'Portfolio lab'
    : 'GitHub';
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const detailHref = `/projects/${project.slug}`;
  const detailLabel = useLocale()() === 'no' ? 'prosjektdetaljer' : 'project details';

  return (
    <article
      data-spotlight
      class={cn(
        'glass-card spotlight group grid transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-36px_hsl(var(--shadow)/0.5)]',
        featured
          ? 'lg:grid-cols-[minmax(17rem,0.85fr)_minmax(0,1.15fr)]'
          : 'h-full grid-rows-[15rem_1fr]',
      )}
    >
      <div aria-hidden='true' class='glass-lens' data-morph-preserve='style data-glass-active' />
      <Link
        href={detailHref}
        aria-label={`${project.name} — ${detailLabel}`}
        data-tilt
        class={cn(
          'tilt relative isolate flex min-h-0 items-center justify-center overflow-hidden border-border bg-project-surface/40 p-8 no-underline [transform:perspective(90rem)_rotateX(calc(var(--tilt-x,0deg)*0.4))_rotateY(calc(var(--tilt-y,0deg)*0.4))]! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          featured ? 'border-b lg:border-r lg:border-b-0 lg:p-12' : 'border-b',
        )}
      >
        <DotMatrix
          mode='field'
          spacing={10}
          fade={0}
          lens={110}
          class='z-0 opacity-35 transition-opacity duration-500 group-hover:opacity-60'
        />
        <span class='absolute top-5 left-5 z-10 font-mono text-[0.6875rem] tracking-[0.16em] text-muted-foreground transition-colors duration-300 group-hover:text-primary'>
          /0{index + 1}
        </span>
        <div class='absolute inset-5 z-[1] border border-foreground/5' />
        <img
          src={project.image_url}
          alt={`${project.name} project mark`}
          width='300'
          height='300'
          loading={featured ? 'eager' : 'lazy'}
          class={cn(
            'relative z-10 object-contain drop-shadow-[0_18px_30px_hsl(var(--shadow)/0.2)] transition-transform duration-500 ease-out group-hover:scale-[1.035]',
            featured ? 'h-44 w-44 sm:h-52 sm:w-52' : 'h-36 w-36',
          )}
        />
      </Link>

      <div
        class={cn(
          'flex min-w-0 flex-col p-6 sm:p-8',
          featured && 'lg:justify-center lg:p-12',
        )}
      >
        <div class='mb-5 flex items-center justify-between gap-4 whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.13em] text-muted-foreground'>
          <span>{sourceLabel}</span>
          <span>
            {project.source_type === 'github'
              ? 'Open source'
              : project.source_type === 'internal'
              ? 'Interactive'
              : 'Shipped'}
          </span>
        </div>

        <Heading
          class={cn(
            'font-bold leading-[1.08] tracking-[-0.035em] text-foreground',
            featured ? 'text-3xl sm:text-4xl' : 'text-2xl',
          )}
        >
          <Link
            href={detailHref}
            class='text-inherit no-underline transition-colors hover:text-primary'
          >
            {project.name}
          </Link>
        </Heading>
        <p
          class={cn(
            'mt-5 flex-1 whitespace-pre-line leading-7 text-muted-foreground',
            featured ? 'max-w-2xl text-[1.0625rem]' : 'text-[0.9375rem]',
          )}
        >
          {project.description}
        </p>

        <div class='mt-7 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-5 transition-transform duration-500 ease-(--ease-out) group-hover:translate-x-1'>
          {Object.keys(project.technologies).map((technology) => (
            <span class='font-mono text-[0.6875rem] uppercase tracking-widest text-muted-foreground'>
              {technology}
            </span>
          ))}
        </div>

        <Link
          href={project.source_link}
          class='mt-7 inline-flex w-fit items-center gap-2 whitespace-nowrap text-sm font-bold text-foreground no-underline decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card'
          aria-label={`${copy.visit_project}: ${project.name}`}
          external={!isInternal}
        >
          {project.source_type === 'appstore' ? copy.download_app_store : copy.visit_project}
          <Icon node={isInternal ? ArrowRight : ArrowUpRight} size={15} />
        </Link>
      </div>
    </article>
  );
}
