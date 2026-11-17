import { Link, LinkButton } from '../components/link.tsx';
import { ArrowRight, Download, ExternalLink, Play, Star } from 'lucide';
import DotMatrix from '../components/dot-matrix.tsx';
import ProjectCard from '../components/project-card.tsx';
import SectionHeader from '../components/section-header.tsx';
import ZedContribution from '../components/zed-contribution.tsx';
import { formatCompact } from '../lib/format.ts';
import Icon from '../lib/icon.tsx';
import { useLocale } from '../lib/locale.ts';
import { reveal, revealStagger } from '../lib/motion.ts';
import { useServerData } from '../lib/server-data.ts';

const homeCopy = {
  en: {
    prs: 'PRs merged',
    lines: 'Lines changed',
    downloads: 'Downloads',
    plus: 'plus',
    minus: 'minus',
    automata: 'Automata',
    available: 'Open for work',
    zed: 'Zed contributions',
    zedDescription:
      'Zed Guild member and Gruber Darker maintainer, with contributions in Rust and GPUI.',
    projects: 'Personal projects',
    projectsDescription: 'Rust, native software, and shipped products.',
    contact: 'Have something worth building?',
    contactLines: ['Have something', 'worth building?'],
    craft: 'What I build',
    craftTitle: 'From the metal to the pixels.',
    craftIntro: 'Mostly self-taught, based in Arendal, Norway.',
    steps: [
      {
        title: 'Under the hood',
        body: 'Servers, tools, and the parts of software nobody sees but everyone relies on.',
        file: 'systems',
        link: 'Open-source work',
        href: '/experience',
      },
      {
        title: 'On the desktop',
        body: 'Apps that run on your computer. I contribute to Zed, an open-source code editor.',
        file: 'desktop',
        link: 'Zed contributions',
        href: '/projects/zed-editor-contributions',
      },
      {
        title: 'On your phone',
        body: 'Where I started: an iPhone app I designed, built, and published on my own.',
        file: 'mobile',
        link: 'Appleosophy',
        href: '/projects/appleosophy',
      },
    ],
  },
  no: {
    prs: 'Sammenslåtte PR-er',
    lines: 'Endrede linjer',
    downloads: 'Nedlastinger',
    plus: 'pluss',
    minus: 'minus',
    automata: 'Automata',
    available: 'Åpen for arbeid',
    zed: 'Zed-bidrag',
    zedDescription: 'Zed Guild-medlem, Gruber Darker-vedlikeholder og bidragsyter i Rust og GPUI.',
    projects: 'Personlige prosjekter',
    projectsDescription: 'Rust, native programvare og lanserte produkter.',
    contact: 'Har du noe verdt å bygge?',
    contactLines: ['Har du noe', 'verdt å bygge?'],
    craft: 'Hva jeg bygger',
    craftTitle: 'Fra metallet til pikslene.',
    craftIntro: 'Stort sett selvlært, basert i Arendal.',
    steps: [
      {
        title: 'Under panseret',
        body: 'Servere, verktøy og de delene av programvare ingen ser, men alle er avhengige av.',
        file: 'systemer',
        link: 'Åpen kildekode',
        href: '/experience',
      },
      {
        title: 'På datamaskinen',
        body:
          'Apper som kjører på datamaskinen din. Jeg bidrar til Zed, en kodeeditor med åpen kildekode.',
        file: 'datamaskin',
        link: 'Zed-bidrag',
        href: '/projects/zed-editor-contributions',
      },
      {
        title: 'På telefonen',
        body: 'Der jeg startet: en iPhone-app jeg designet, bygget og publiserte på egen hånd.',
        file: 'mobil',
        link: 'Appleosophy',
        href: '/projects/appleosophy',
      },
    ],
  },
} as const;

export default function Home() {
  const { data, experience } = useServerData((value) => value);
  const locale = useLocale()();
  const loc = data[locale];
  const name = `${data.about.first_name} ${data.about.last_name}`;
  const copy = homeCopy[locale];

  const experienceItems = experience;
  const zedItems = experienceItems.filter((item) => item.featured);
  const prItems = zedItems.filter((item) => item.type === 'pr');
  const extensionItem = zedItems.find((item) => item.type === 'zed-extension');
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
      value: <span data-count>{String(prItems.length)}</span>,
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
          ]
            .filter(Boolean)
            .join(', ')}
        >
          {prAdditions > 0 && (
            <span class='text-diff-addition'>
              +<span data-count>{String(prAdditions)}</span>
            </span>
          )}
          {prAdditions > 0 && prDeletions > 0 && (
            <span aria-hidden='true' class='text-muted-foreground'>
              /
            </span>
          )}
          {prDeletions > 0 && (
            <span class='text-diff-deletion'>
              −<span data-count>{String(prDeletions)}</span>
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
          <span data-count>{formatCompact(extensionDownloads)}</span>
        </span>
      ),
      show: extensionDownloads > 0,
    },
    {
      label: 'zed-industries/zed',
      value: (
        <span class='inline-flex items-center gap-2'>
          <Icon node={Star} size={18} />
          <span data-count>{formatCompact(zedStars)}</span>
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
      <section class='hero-surface relative isolate -mt-16 overflow-hidden pt-16'>
        <div class='absolute inset-0 -z-20'>
          <DotMatrix mode='field' spacing={16} lens={170} />
        </div>
        <div class='pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,hsl(var(--background))_0%,hsl(var(--background)/0.92)_38%,hsl(var(--background)/0.35)_100%)]' />

        <div class='mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-7xl grid-cols-1 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)] lg:px-10'>
          <div class='contents lg:relative lg:flex lg:flex-col lg:justify-center lg:border-r lg:border-border lg:py-20 lg:pr-16 lg:after:absolute lg:after:top-full lg:after:-right-px lg:after:h-[calc(var(--tile-edge)+3rem)] lg:after:border-r lg:after:border-border'>
            <div
              {...reveal}
              data-scramble-group
              class='order-1 mb-6 flex items-center gap-2 pt-8 whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground sm:mb-8 sm:gap-3 sm:pt-12 sm:tracking-[0.16em] lg:order-0 lg:pt-0'
            >
              <span class='h-2 w-2 bg-primary' />
              <span data-scramble>{loc.hero.role}</span>
              <span class='h-px min-w-3 flex-1 bg-border sm:max-w-10' />
              <span data-scramble>Rust · Native</span>
            </div>

            <h1
              data-reveal='lines'
              data-morph-preserve='data-revealed'
              aria-label={`${name}.`}
              class='order-2 max-w-4xl text-[clamp(3.2rem,8vw,6.8rem)] font-bold leading-[0.88] tracking-[-0.065em] text-foreground lg:order-0'
            >
              <span class='reveal-line' aria-hidden='true'>
                <span>{data.about.first_name}</span>
              </span>
              <span class='reveal-line' aria-hidden='true'>
                <span>
                  {data.about.last_name}
                  <span class='text-primary'>.</span>
                </span>
              </span>
            </h1>
            <p
              {...reveal}
              class='order-4 mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:mt-8 sm:text-xl sm:leading-9 lg:order-0'
            >
              {loc.hero.description}
            </p>

            <div
              {...reveal}
              class='order-5 mt-7 mb-8 grid w-full grid-cols-2 gap-2.5 sm:mt-9 sm:mb-12 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3 lg:order-0 lg:mb-0'
            >
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

          <div class='relative order-3 mt-8 flex items-center px-1 sm:mt-10 sm:px-12 lg:order-0 lg:mt-0 lg:min-h-0 lg:px-10 lg:py-10'>
            <div {...reveal} class='relative mx-auto w-full max-w-xl lg:max-w-sm'>
              <div class='absolute -top-3 -right-3 h-16 w-16 border-t border-r border-primary lg:-top-5 lg:-right-4 lg:h-24 lg:w-24' />
              <div class='absolute -bottom-3 -left-3 h-16 w-16 border-b border-l border-primary lg:-bottom-4 lg:-left-4 lg:h-24 lg:w-24' />
              <div
                data-protected-asset
                class='protected-asset group/photo relative aspect-4/3 overflow-hidden border border-border bg-muted sm:aspect-16/10 lg:aspect-3/4'
              >
                <img
                  src='/static/headshot.webp'
                  alt={`Portrait of ${name}`}
                  draggable='false'
                  width='360'
                  height='540'
                  class='h-full w-full object-cover object-center saturate-[0.88] transition-[filter] duration-500 dark:brightness-[0.82] dark:saturate-[0.72]'
                />
                <DotMatrix
                  mode='image'
                  src='/static/headshot.webp'
                  focusY={0.5}
                  spacing={7}
                  lens={90}
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

        {/* Room for the Zed surface's tiled top edge to land in. */}
        <div
          aria-hidden='true'
          class='h-[calc(var(--tile-edge)+2rem)] sm:h-[calc(var(--tile-edge)+3rem)]'
        />
      </section>

      <section class='relative isolate overflow-x-clip'>
        <div
          class='card-landscape tile-edges -z-10 bg-muted'
          data-tile-edges
          data-morph-preserve='style'
        >
          <div class='technical-grid absolute inset-0 opacity-40' />
        </div>
        <div class='mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10'>
          <SectionHeader
            eyebrow={`02 / ${loc.work.subtitle}`}
            title={copy.zed}
            description={copy.zedDescription}
          />

          {zedStats.length > 0 && (
            <div
              {...revealStagger}
              class={`mb-10 grid gap-3 ${zedStatColumns}`}
            >
              {zedStats.map((stat) => (
                <div>
                  <div class='glass-card group h-full border border-border p-4 sm:p-6'>
                    <p class='font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                      {stat.label}
                    </p>
                    <p class='mt-2 text-xl font-bold tabular-nums tracking-[-0.02em] transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-1 sm:text-2xl'>
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div {...revealStagger} class='grid grid-cols-1 gap-5 lg:grid-cols-3'>
            {zedItems.map((item, index) => (
              <div key={`${item.type}-${index}`} class='h-full'>
                <ZedContribution item={item} index={index} />
              </div>
            ))}
          </div>
        </div>
        {/* Keep the departing edge below the cards, with room to open into tiles. */}
        <div
          aria-hidden='true'
          class='h-[calc(var(--tile-edge)+4rem)] sm:h-[calc(var(--tile-edge)+5rem)]'
        />
      </section>

      {/* Temporarily hidden while this section is revised. */}
      <section
        hidden
        class='scroll-scene'
        data-scroll-scene
        data-steps='3'
        data-step='0'
        data-morph-preserve='data-step style'
        aria-labelledby='craft-title'
      >
        <div class='scroll-scene-sticky'>
          <div class='mx-auto grid h-full w-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-1 lg:items-center lg:gap-16 lg:px-10 lg:py-0'>
            <div class='relative flex gap-6 lg:gap-8'>
              <div class='relative hidden w-px shrink-0 bg-border sm:block'>
                <div class='scene-meter absolute inset-0 bg-primary' />
              </div>
              <div class='min-w-0'>
                <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                  03 / {copy.craft}
                </p>
                <h2
                  id='craft-title'
                  class='mt-3 max-w-md text-3xl font-bold tracking-[-0.045em] sm:text-5xl'
                >
                  {copy.craftTitle}
                </h2>
                <p class='mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7'>
                  {copy.craftIntro}
                </p>
                <ol class='mt-6 space-y-3 sm:mt-10 sm:space-y-7'>
                  {copy.steps.map((step, index) => (
                    <li data-step-item={String(index)} class='max-w-md'>
                      <p class='flex items-baseline gap-3 text-lg font-bold sm:text-2xl'>
                        <span class='font-mono text-[0.6875rem] font-normal text-primary'>
                          0{index + 1}
                        </span>
                        {step.title}
                      </p>
                      <p class='mt-1.5 pl-7 text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7'>
                        {step.body}
                      </p>
                      <Link
                        href={step.href}
                        external={step.href.startsWith('http')}
                        class='group mt-2 ml-7 inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-foreground no-underline hover:text-primary'
                      >
                        {step.link}
                        <Icon
                          node={step.href.startsWith('http') ? ExternalLink : ArrowRight}
                          size={12}
                          class='transition-transform group-hover:translate-x-0.5'
                        />
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div class='craft-visual relative h-full min-h-0 border border-border bg-card lg:h-[min(34rem,72vh)]'>
              <div class='absolute inset-x-0 top-0 flex h-9 items-center justify-between border-b border-border px-4 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground'>
                <span class='flex items-center gap-1.5'>
                  <span class='h-2 w-2 bg-border' />
                  <span class='h-2 w-2 bg-border' />
                  <span class='h-2 w-2 bg-primary' />
                </span>
                <span class='relative h-4 w-56 text-right normal-case tracking-[0.04em]'>
                  {copy.steps.map((step, index) => (
                    <span data-step-panel={String(index)} class='absolute inset-0'>
                      {step.file}
                    </span>
                  ))}
                </span>
              </div>
              <div class='absolute inset-x-0 top-9 bottom-0'>
                <DotMatrix mode='morph' shapes='gear,window,phone' spacing={11} lens={120} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class='card-landscape py-20 sm:py-28'>
        <div class='mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10'>
          <SectionHeader
            eyebrow={`03 / ${copy.projects}`}
            title={loc.nav.work}
            description={copy.projectsDescription}
          />

          {personalProjects.length > 0 && (
            <div {...revealStagger} class='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
              {personalProjects.map((project, index) => (
                <div class='h-full'>
                  <ProjectCard project={project} index={index} copy={loc.work} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section class='relative isolate overflow-hidden border-t border-border py-24 sm:py-32'>
        <div class='absolute inset-0 -z-20'>
          <DotMatrix mode='field' spacing={14} lens={200} fade={0} />
        </div>
        <div class='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_25%_60%,hsl(var(--background))_25%,hsl(var(--background)/0.55)_70%,hsl(var(--background)/0.2))]' />
        <div class='mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 px-5 sm:px-8 md:flex-row md:items-end lg:px-10'>
          <div>
            <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
              04 / {loc.nav.contact}
            </p>
            <h2
              data-reveal='lines'
              data-morph-preserve='data-revealed'
              aria-label={copy.contact}
              class='mt-4 max-w-2xl text-4xl font-bold tracking-[-0.045em] sm:text-6xl'
            >
              {copy.contactLines.map((line) => (
                <span class='reveal-line' aria-hidden='true'>
                  <span>{line}</span>
                </span>
              ))}
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
}
