import { Link } from 'areia';
import { ArrowUpRight } from 'lucide';
import type { Project } from '../bindings';
import type { Work } from '../bindings/Work';
import { cn } from '../lib/cn';
import Icon from '../lib/icon';

export default function ProjectCard({
  project,
  index,
  featured = false,
  copy,
}: {
  project: Project;
  index: number;
  featured?: boolean;
  copy: Work;
}) {
  const sourceLabel =
    project.source_type === 'appstore' ? 'App Store' : 'GitHub';

  return (
    <article
      class={cn(
        'project-card group grid overflow-hidden border border-border bg-card transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-[0_24px_60px_-36px_hsl(var(--shadow)/0.5)]',
        featured
          ? 'lg:grid-cols-[minmax(17rem,0.85fr)_minmax(0,1.15fr)]'
          : 'h-full grid-rows-[15rem_1fr]',
      )}
    >
      <div
        class={cn(
          'relative isolate flex min-h-0 items-center justify-center overflow-hidden border-border bg-project-surface p-8',
          featured ? 'border-b lg:border-r lg:border-b-0 lg:p-12' : 'border-b',
        )}
      >
        <span class='absolute top-5 left-5 font-mono text-[0.6875rem] tracking-[0.16em] text-muted-foreground'>
          /0{index + 1}
        </span>
        <div class='absolute inset-5 border border-foreground/[0.05]' />
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
      </div>

      <div
        class={cn(
          'flex min-w-0 flex-col p-6 sm:p-8',
          featured && 'lg:justify-center lg:p-12',
        )}
      >
        <div class='mb-5 flex items-center justify-between gap-4 font-mono text-[0.6875rem] uppercase tracking-[0.13em] text-muted-foreground'>
          <span>{sourceLabel}</span>
          <span>
            {project.source_type === 'github' ? 'Open source' : 'Shipped'}
          </span>
        </div>

        <h3
          class={cn(
            'font-bold leading-[1.08] tracking-[-0.035em] text-foreground',
            featured ? 'text-3xl sm:text-4xl' : 'text-2xl',
          )}
        >
          {project.name}
        </h3>
        <p
          class={cn(
            'mt-5 flex-1 whitespace-pre-line leading-7 text-muted-foreground',
            featured ? 'max-w-2xl text-[1.0625rem]' : 'text-[0.9375rem]',
          )}
        >
          {project.description}
        </p>

        <div class='mt-7 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-5'>
          {Object.keys(project.technologies).map((technology) => (
            <span class='font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-foreground/70'>
              {technology}
            </span>
          ))}
        </div>

        <Link
          href={project.source_link}
          class='mt-7 inline-flex w-fit items-center gap-2 text-sm font-bold text-foreground no-underline decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card'
          aria-label={`${copy.visit_project}: ${project.name}`}
          external
        >
          {project.source_type === 'appstore'
            ? copy.download_app_store
            : copy.visit_project}
          <Icon node={ArrowUpRight} size={15} />
        </Link>
      </div>
    </article>
  );
}
