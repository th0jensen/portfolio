import { Link, LinkButton } from 'areia';
import ilha from 'ilha';
import { ArrowRight, Download, ExternalLink, Play, Star } from 'lucide';
import type { Data, ExperienceItem } from '../bindings/index.ts';
import ProjectCard from '../components/project-card.tsx';
import SectionHeader from '../components/section-header.tsx';
import ZedContribution from '../components/zed-contribution.tsx';
import { formatCompact } from '../lib/format.ts';
import Icon from '../lib/icon.tsx';
import { locale } from '../lib/locale.ts';

type PageInput = {
  data: Pick<Data, 'about' | 'projects'> & {
    en: Pick<Data['en'], 'nav' | 'hero' | 'buttons' | 'work'>;
    no: Pick<Data['no'], 'nav' | 'hero' | 'buttons' | 'work'>;
  };
  experience: ExperienceItem[];
};

const homeCopy = {
  en: {
    prs: 'PRs merged',
    lines: 'Lines changed',
    downloads: 'Downloads',
    plus: 'plus',
    minus: 'minus',
    automata: 'Automata',
    available: 'Open to roles',
    status: 'Looking for my next team.',
    zed: 'Zed contributions',
    zedDescription:
      'Zed Guild member and Gruber Darker maintainer, with contributions in Rust and GPUI.',
    projects: 'Personal projects',
    projectsDescription: 'Rust, native software, and shipped products.',
    contact: 'Have something worth building?',
  },
  no: {
    prs: 'Sammenslåtte PR-er',
    lines: 'Endrede linjer',
    downloads: 'Nedlastinger',
    plus: 'pluss',
    minus: 'minus',
    automata: 'Automata',
    available: 'Åpen for arbeid',
    status: 'Ser etter ny arbeidsgiver.',
    zed: 'Zed-bidrag',
    zedDescription: 'Zed Guild-medlem, Gruber Darker-vedlikeholder og bidragsyter i Rust og GPUI.',
    projects: 'Personlige prosjekter',
    projectsDescription: 'Rust, native programvare og lanserte produkter.',
    contact: 'Har du noe verdt å bygge?',
  },
} as const;

export default ilha
  .input<PageInput>()
  .state('data', ({ data }) => data)
  .state('experience', ({ experience }) => experience)
  .render(({ state }) => {
    const data = state.data();
    const loc = data[locale()];
    const name = `${data.about.first_name} ${data.about.last_name}`;
    const copy = homeCopy[locale()];

    const experienceItems = state.experience();
    const zedItems = experienceItems.filter((item) => item.featured);
    const prItems = zedItems.filter((item) => item.type === 'pr');
    const extensionItem = zedItems.find(
      (item) => item.type === 'zed-extension',
    );
    const prAdditions = prItems.reduce(
      (sum, item) => sum + Number(item.additions ?? 0),
      0,
    );
    const prDeletions = prItems.reduce(
      (sum, item) => sum + Number(item.deletions ?? 0),
      0,
    );
    const extensionDownloads = Number(extensionItem?.downloads ?? 0);
    const zedStars = Number(prItems[0]?.stars ?? 0);

    const personalProjects = data.projects.filter((project) => !project.featured);

    const zedStats = [
      {
        label: copy.prs,
        value: String(prItems.length),
        show: prItems.length > 0,
      },
      {
        label: copy.lines,
        value: (
          <span
            class='inline-flex flex-wrap items-baseline gap-x-2'
            aria-label={[
              prAdditions > 0 && `${copy.plus} ${String(prAdditions)}`,
              prDeletions > 0 && `${copy.minus} ${String(prDeletions)}`,
            ].filter(Boolean).join(', ')}
          >
            {prAdditions > 0 && (
              <span class='text-diff-addition'>
                +{String(prAdditions)}
              </span>
            )}
            {prAdditions > 0 && prDeletions > 0 && (
              <span aria-hidden='true' class='text-muted-foreground'>
                /
              </span>
            )}
            {prDeletions > 0 && (
              <span class='text-diff-deletion'>
                −{String(prDeletions)}
              </span>
            )}
          </span>
        ),
        show: prAdditions > 0 || prDeletions > 0,
      },
      {
        label: copy.downloads,
        value: (
          <span class='inline-flex items-center gap-2'>
            <Icon node={Download} size={18} />
            {formatCompact(extensionDownloads)}
          </span>
        ),
        show: extensionDownloads > 0,
      },
      {
        label: 'zed-industries/zed',
        value: (
          <span class='inline-flex items-center gap-2'>
            <Icon node={Star} size={18} />
            {formatCompact(zedStars)}
          </span>
        ),
        show: zedStars > 0,
      },
    ].filter((stat) => stat.show);
    const zedStatColumns = zedStats.length === 1
      ? 'grid-cols-1'
      : zedStats.length === 2
      ? 'grid-cols-2'
      : zedStats.length === 3
      ? 'grid-cols-2 sm:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';

    return (
      <>
        <section class='relative isolate overflow-hidden border-b border-border'>
          <div class='technical-grid absolute inset-0 -z-20 opacity-45' />
          <div class='absolute inset-0 -z-10 bg-[linear-gradient(90deg,hsl(var(--background)/0.97)_0%,hsl(var(--background)/0.9)_52%,hsl(var(--background)/0.7)_100%)]' />

          <div class='mx-auto grid w-full max-w-7xl grid-cols-1 px-5 sm:px-8 lg:min-h-152 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)] lg:px-10'>
            <div class='contents lg:flex lg:flex-col lg:justify-center lg:border-r lg:border-border lg:py-24 lg:pr-16'>
              <div class='order-1 mb-6 flex items-center gap-2 pt-8 whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground sm:mb-8 sm:gap-3 sm:pt-12 sm:tracking-[0.16em] lg:order-0 lg:pt-0'>
                <span class='h-2 w-2 bg-primary' />
                <span>{loc.hero.role}</span>
                <span class='h-px min-w-3 flex-1 bg-border sm:max-w-10' />
                <span>Rust · Native</span>
              </div>

              <h1 class='order-2 max-w-4xl text-[clamp(3.2rem,8vw,6.8rem)] font-bold leading-[0.88] tracking-[-0.065em] text-foreground lg:order-0'>
                {name}.
              </h1>
              <p class='order-4 mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:mt-8 sm:text-xl sm:leading-9 lg:order-0'>
                {loc.hero.description}
              </p>

              <div class='order-5 mt-7 mb-8 grid w-full grid-cols-2 gap-2.5 sm:mt-9 sm:mb-12 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3 lg:order-0 lg:mb-0'>
                <LinkButton
                  href='/projects'
                  variant='primary'
                  class='group col-span-2 min-h-11 w-full justify-center whitespace-nowrap rounded-sm px-4 font-bold sm:col-span-1 sm:w-auto sm:px-5'
                >
                  {loc.hero.explore_work}
                  <Icon
                    node={ArrowRight}
                    size={16}
                    class='transition-transform group-hover:translate-x-0.5'
                  />
                </LinkButton>
                <LinkButton
                  href='/automata'
                  variant='ghost'
                  class='group min-h-11 w-full min-w-0 justify-center whitespace-nowrap rounded-sm border border-border px-3 font-bold sm:w-auto sm:px-5'
                >
                  {copy.automata}
                  <Icon node={Play} size={14} />
                </LinkButton>
                <LinkButton
                  href='/static/resume.pdf'
                  variant='ghost'
                  class='min-h-11 w-full min-w-0 justify-center whitespace-nowrap rounded-sm border border-border px-3 font-bold sm:w-auto sm:px-5'
                  external
                >
                  {loc.buttons.resume}
                  <Icon node={ExternalLink} size={14} />
                </LinkButton>
              </div>
            </div>

            <div class='relative order-3 mt-8 flex items-center px-1 sm:mt-10 sm:px-12 lg:order-0 lg:mt-0 lg:min-h-0 lg:items-end lg:px-10 lg:pt-20 lg:pb-0'>
              <div class='relative mx-auto w-full max-w-xl lg:max-w-sm'>
                <div class='absolute -top-3 -right-3 h-16 w-16 border-t border-r border-primary lg:-top-5 lg:-right-4 lg:h-24 lg:w-24' />
                <div class='absolute -bottom-3 -left-3 h-16 w-16 border-b border-l border-primary lg:-bottom-4 lg:-left-4 lg:h-24 lg:w-24' />
                <div class='relative aspect-4/3 overflow-hidden border border-border bg-muted sm:aspect-16/10 lg:aspect-3/4'>
                  <img
                    src='/static/headshot.webp'
                    alt={`Portrait of ${name}`}
                    width='360'
                    height='540'
                    fetchpriority='high'
                    class='h-full w-full object-cover object-[center_22%] saturate-[0.88] transition-[filter] duration-500 dark:brightness-[0.82] dark:saturate-[0.72] lg:object-center'
                  />
                  <div class='absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,hsl(var(--shadow)/0.9),transparent)] px-4 pt-16 pb-4 text-white sm:px-5 sm:pt-20 sm:pb-5'>
                    <p class='inline-flex items-center gap-2 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-white'>
                      <span class='h-1.5 w-1.5 shrink-0 bg-primary' />
                      {copy.available}
                    </p>
                  </div>
                </div>
                <span class='absolute top-4 -left-2 bg-primary px-2 py-1 font-mono text-[0.625rem] font-bold uppercase tracking-[0.12em] text-primary-foreground'>
                  01 / Profile
                </span>
              </div>
            </div>
          </div>

          <div class='border-t border-border bg-background/80'>
            <div class='mx-auto grid w-full max-w-7xl px-5 sm:px-8 lg:px-10'>
              <div class='flex min-w-0 items-center gap-3 py-4 md:pr-8'>
                <span class='shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground'>
                  Status
                </span>
                <span class='h-1 w-1 shrink-0 bg-primary' />
                <Link
                  href='/contact'
                  class='truncate text-sm font-bold text-foreground no-underline hover:text-primary'
                >
                  {copy.status}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section class='relative isolate overflow-hidden border-b border-border bg-muted/35'>
          <div class='technical-grid absolute inset-0 -z-10 opacity-30' />
          <div class='mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10'>
            <SectionHeader
              eyebrow={`02 / ${loc.work.subtitle}`}
              title={copy.zed}
              description={copy.zedDescription}
            />

            {zedStats.length > 0 && (
              <div
                class={`mb-10 grid gap-px border border-border bg-border ${zedStatColumns}`}
              >
                {zedStats.map((stat) => (
                  <div class='bg-card p-4 sm:p-6'>
                    <p class='font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                      {stat.label}
                    </p>
                    <p class='mt-2 text-xl font-bold tracking-[-0.02em] sm:text-2xl'>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div class='grid grid-cols-1 gap-5 lg:grid-cols-3'>
              {zedItems.map((item, index) => (
                <ZedContribution key={`${item.type}-${index}`} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section class='py-20 sm:py-28'>
          <div class='mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10'>
            <SectionHeader
              eyebrow={`03 / ${copy.projects}`}
              title={loc.nav.work}
              description={copy.projectsDescription}
            />

            {personalProjects.length > 0 && (
              <div class='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
                {personalProjects.map((project, index) => (
                  <ProjectCard
                    project={project}
                    index={index}
                    copy={loc.work}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section class='py-20 sm:py-24'>
          <div class='mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 px-5 sm:px-8 md:flex-row md:items-end lg:px-10'>
            <div>
              <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                04 / {loc.nav.contact}
              </p>
              <h2 class='mt-4 max-w-2xl text-4xl font-bold tracking-[-0.045em] sm:text-5xl'>
                {copy.contact}
              </h2>
            </div>
            <LinkButton
              href='/contact'
              variant='primary'
              class='group min-h-11 shrink-0 rounded-sm px-5 font-bold'
            >
              {loc.nav.contact}
              <Icon
                node={ArrowRight}
                size={16}
                class='transition-transform group-hover:translate-x-0.5'
              />
            </LinkButton>
          </div>
        </section>
      </>
    );
  });
