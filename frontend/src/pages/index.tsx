import { Link, LinkButton } from 'areia';
import ilha from 'ilha';
import { ArrowRight, ArrowUpRight, ExternalLink } from 'lucide';
import type { Data, NowPlayingTrack } from '../bindings';
import ProjectCard from '../components/project-card';
import Icon from '../lib/icon';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
};

function formatCompact(value: bigint | number): string {
  const number = typeof value === 'bigint' ? Number(value) : value;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}m`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}k`;
  return String(number);
}

export default ilha
  .state('data', ({ data }: PageInput) => data ?? null)
  .state('nowPlaying', null as NowPlayingTrack | null)
  .effect(({ state }) => {
    if (!state.data()) {
      (async () => {
        try {
          state.data(await api.data.query());
        } catch {}
      })();
    }

    (async () => {
      try {
        state.nowPlaying(await api.lastfm.query());
      } catch {}
    })();
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return '';

    const loc = data[locale()];
    const name = `${data.about.first_name} ${data.about.last_name}`;
    const track = state.nowPlaying();
    const featuredProject = data.projects[1];
    const secondaryProjects = [data.projects[0], data.projects[2]];
    const contributions = data.experience_items.slice(0, 2);
    const isNorwegian = locale() === 'no';

    return (
      <>
        <section class='relative isolate overflow-hidden border-b border-border'>
          <div class='technical-grid absolute inset-0 -z-20 opacity-45' />
          <div class='absolute inset-0 -z-10 bg-[linear-gradient(90deg,hsl(var(--background)/0.97)_0%,hsl(var(--background)/0.9)_52%,hsl(var(--background)/0.7)_100%)]' />

          <div class='mx-auto grid min-h-[38rem] w-full max-w-7xl grid-cols-1 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)] lg:px-10'>
            <div class='flex flex-col justify-center py-16 lg:border-r lg:border-border lg:py-24 lg:pr-16'>
              <div class='mb-8 flex items-center gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground'>
                <span class='h-2 w-2 bg-primary' />
                <span>{loc.hero.role}</span>
                <span class='h-px w-10 bg-border' />
                <span>Rust · GPUI</span>
              </div>

              <h1 class='max-w-4xl text-[clamp(3.2rem,8vw,6.8rem)] font-bold leading-[0.88] tracking-[-0.065em] text-foreground'>
                {name}.
              </h1>
              <p class='mt-8 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9'>
                {loc.hero.description}
              </p>

              <div class='mt-9 flex flex-wrap items-center gap-3'>
                <LinkButton
                  href='/projects'
                  variant='primary'
                  class='group min-h-11 rounded-sm px-5 font-bold'
                >
                  {loc.hero.explore_work}
                  <Icon
                    node={ArrowRight}
                    size={16}
                    attrs='class="transition-transform group-hover:translate-x-0.5"'
                  />
                </LinkButton>
                <LinkButton
                  href='/static/resume.pdf'
                  variant='ghost'
                  class='min-h-11 rounded-sm border border-border px-5 font-bold'
                  external
                >
                  {loc.buttons.resume}
                  <Icon node={ExternalLink} size={14} />
                </LinkButton>
              </div>
            </div>

            <div class='relative flex min-h-[30rem] items-end px-4 pt-10 sm:px-12 lg:min-h-0 lg:px-10 lg:pt-20'>
              <div class='relative mx-auto w-full max-w-sm'>
                <div class='absolute -top-5 -right-4 h-24 w-24 border-t border-r border-primary/55' />
                <div class='absolute -bottom-4 -left-4 h-24 w-24 border-b border-l border-primary/55' />
                <div class='relative aspect-[3/4] overflow-hidden border border-border bg-muted'>
                  <picture>
                    <source srcset='/static/headshot.webp' type='image/webp' />
                    <img
                      src='/static/headshot.jpg'
                      alt={`Portrait of ${name}`}
                      width='360'
                      height='540'
                      fetchpriority='high'
                      class='h-full w-full object-cover object-center saturate-[0.88] transition-[filter] duration-500 dark:brightness-[0.82] dark:saturate-[0.72]'
                    />
                  </picture>
                  <div class='absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,hsl(var(--shadow)/0.72),transparent)] px-5 pt-20 pb-5 text-white'>
                    <p class='font-mono text-[0.625rem] uppercase tracking-[0.15em] text-white/70'>
                      {isNorwegian ? 'Nåværende fokus' : 'Current focus'}
                    </p>
                    <Link
                      href={featuredProject.source_link}
                      class='mt-1 inline-flex items-center gap-1.5 text-base font-bold text-white no-underline hover:underline'
                      external
                    >
                      {featuredProject.name}
                      <Icon node={ArrowUpRight} size={15} />
                    </Link>
                  </div>
                </div>
                <span class='absolute top-4 -left-2 bg-primary px-2 py-1 font-mono text-[0.625rem] font-bold uppercase tracking-[0.12em] text-primary-foreground'>
                  01 / Profile
                </span>
              </div>
            </div>
          </div>

          <div class='border-t border-border bg-background/80'>
            <div
              class={
                track
                  ? 'mx-auto grid w-full max-w-7xl grid-cols-1 divide-y divide-border px-5 sm:px-8 md:grid-cols-2 md:divide-x md:divide-y-0 lg:px-10'
                  : 'mx-auto grid w-full max-w-7xl grid-cols-1 px-5 sm:px-8 lg:px-10'
              }
            >
              <div class='flex min-w-0 items-center gap-3 py-4 md:pr-8'>
                <span class='shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground'>
                  {isNorwegian ? 'Bygger' : 'Building'}
                </span>
                <span class='h-1 w-1 shrink-0 bg-primary' />
                <Link
                  href={featuredProject.source_link}
                  class='truncate text-sm font-bold text-foreground no-underline hover:text-primary'
                  external
                >
                  {featuredProject.name}
                </Link>
              </div>
              {track && (
                <div class='flex min-w-0 items-center gap-3 py-4 md:pl-8'>
                  <span class='shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground'>
                    {loc.hero.now_playing}
                  </span>
                  <span class='h-1 w-1 shrink-0 bg-primary' />
                  <a
                    href={track.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    class='truncate text-sm text-foreground no-underline hover:text-primary'
                  >
                    {track.name} · {track.artist}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        <section class='py-20 sm:py-28'>
          <div class='mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10'>
            <div class='mb-12 grid gap-6 border-b border-border pb-8 md:grid-cols-[0.8fr_1.2fr] md:items-end'>
              <div>
                <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                  02 / {loc.work.subtitle}
                </p>
                <h2 class='mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl'>
                  {loc.nav.work}
                </h2>
              </div>
              <p class='max-w-xl text-base leading-7 text-muted-foreground md:justify-self-end'>
                {isNorwegian
                  ? 'Utvalgt systemarbeid, native programvare og produkter levert til virkelige brukere.'
                  : 'Selected systems work, native software, and products shipped to real users.'}
              </p>
            </div>

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
          </div>
        </section>

        <section class='border-y border-border bg-muted/35'>
          <div class='mx-auto grid w-full max-w-7xl grid-cols-1 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10'>
            <div class='py-16 lg:border-r lg:border-border lg:py-24 lg:pr-14'>
              <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                03 / {loc.nav.experience}
              </p>
              <h2 class='mt-4 max-w-md text-4xl font-bold leading-[1.02] tracking-[-0.045em] sm:text-5xl'>
                {loc.experience.subtitle}
              </h2>
              <p class='mt-6 max-w-md leading-7 text-muted-foreground'>
                {loc.experience.description}
              </p>
              <Link
                href='/experience'
                class='mt-8 inline-flex items-center gap-2 text-sm font-bold text-foreground no-underline hover:text-primary'
              >
                {isNorwegian ? 'Se alle bidrag' : 'View all contributions'}
                <Icon node={ArrowRight} size={15} />
              </Link>
            </div>

            <div class='divide-y divide-border py-4 lg:py-10 lg:pl-14'>
              {contributions.map((item, index) => (
                <article class='grid gap-4 py-8 sm:grid-cols-[3rem_1fr_auto] sm:items-start'>
                  <span class='font-mono text-[0.6875rem] text-muted-foreground'>
                    0{index + 1}
                  </span>
                  <div class='min-w-0'>
                    <Link
                      href={item.url}
                      class='inline-flex items-center gap-2 text-lg font-bold text-foreground no-underline hover:text-primary'
                      external
                    >
                      {item.name}
                      {item.pr_number && (
                        <span class='font-mono text-xs font-normal text-muted-foreground'>
                          #{String(item.pr_number)}
                        </span>
                      )}
                    </Link>
                    <p class='mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground'>
                      {item.description}
                    </p>
                  </div>
                  <div class='flex gap-4 font-mono text-[0.6875rem] text-muted-foreground sm:justify-end'>
                    <span>★ {formatCompact(item.stars)}</span>
                    {item.additions != null && (
                      <span class='text-primary'>
                        +{String(item.additions)}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section class='py-20 sm:py-24'>
          <div class='mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 px-5 sm:px-8 md:flex-row md:items-end lg:px-10'>
            <div>
              <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                04 / {loc.nav.contact}
              </p>
              <h2 class='mt-4 max-w-2xl text-4xl font-bold tracking-[-0.045em] sm:text-5xl'>
                {isNorwegian
                  ? 'Har du et teknisk problem verdt å løse?'
                  : 'Have a technical problem worth solving?'}
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
                attrs='class="transition-transform group-hover:translate-x-0.5"'
              />
            </LinkButton>
          </div>
        </section>
      </>
    );
  });
