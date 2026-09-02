import PageHeader from '../components/page-header.tsx';
import ProjectCard from '../components/project-card.tsx';
import { useLocale } from '../lib/locale.ts';
import { useServerData } from '../lib/server-data.ts';

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
          <ProjectCard
            project={featuredProject}
            index={0}
            featured
            headingLevel={2}
            copy={loc.work}
          />
          <div class='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
            {secondaryProjects.map((project, index) => (
              <ProjectCard
                project={project}
                index={index + 1}
                headingLevel={2}
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
}
