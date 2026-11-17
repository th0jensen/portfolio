import PageHeader from '../components/page-header.tsx';
import ProjectCard from '../components/project-card.tsx';
import { useLocale } from '../lib/locale.ts';
import { reveal, revealStagger } from '../lib/motion.ts';
import { useServerData } from '../lib/server-data.ts';

const technologies = [
  ['Rust', 'Systems'],
  ['GPUI', 'Native UI'],
  ['Swift', 'Apple platforms'],
] as const;

export default function Projects() {
  const { data } = useServerData((value) => value);
  const locale = useLocale()();
  const loc = data[locale];
  const isNorwegian = locale === 'no';
  const featuredProject = data.projects.find((project) => project.featured) ?? data.projects[0];
  const secondaryProjects = data.projects.filter(
    (project) => project !== featuredProject,
  );

  return (
    <section id='work' class='flex-1'>
      <PageHeader
        marker='01'
        eyebrow={loc.work.subtitle}
        title={loc.nav.work}
        description={isNorwegian
          ? 'Rust, native programvare og lanserte produkter.'
          : 'Rust, native software, and shipped products.'}
      />

      <div class='mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10'>
        <div class='grid grid-cols-1 gap-5'>
          <div {...reveal}>
            <ProjectCard
              project={featuredProject}
              index={0}
              featured
              headingLevel={2}
              copy={loc.work}
            />
          </div>
          <div
            class='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'
            {...revealStagger}
          >
            {secondaryProjects.map((project, index) => (
              <div class='h-full'>
                <ProjectCard
                  project={project}
                  index={index + 1}
                  headingLevel={2}
                  copy={loc.work}
                />
              </div>
            ))}
          </div>
        </div>

        <div class='mt-16 border-y border-border'>
          <div class='marquee overflow-hidden'>
            <div class='marquee-track'>
              {[false, true].map((duplicate) => (
                <ul
                  class='flex shrink-0 items-center'
                  aria-hidden={duplicate ? 'true' : undefined}
                >
                  {/* Each copy repeats the set so one copy spans the band. */}
                  {[...technologies, ...technologies].map(([technology, context], index) => (
                    <li
                      class='flex items-center gap-3 whitespace-nowrap border-r border-border px-8 py-5 font-mono text-[0.6875rem] uppercase tracking-[0.16em]'
                      aria-hidden={!duplicate && index >= technologies.length ? 'true' : undefined}
                    >
                      <span class='h-1.5 w-1.5 bg-primary' />
                      <span class='font-bold text-foreground'>{technology}</span>
                      <span class='text-muted-foreground/50'>/</span>
                      <span class='text-muted-foreground'>{context}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
