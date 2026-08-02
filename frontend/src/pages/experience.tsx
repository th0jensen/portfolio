import { Link } from 'areia';
import ilha from 'ilha';
import { ArrowUpRight, GitFork, Star } from 'lucide';
import type { Data, ExperienceItem } from '../bindings/index.ts';
import PageHeader from '../components/page-header.tsx';
import ZedContribution from '../components/zed-contribution.tsx';
import { formatCompact } from '../lib/format.ts';
import Icon from '../lib/icon.tsx';
import { locale } from '../lib/locale.ts';

type PageInput = {
  data: {
    en: Pick<Data['en'], 'nav' | 'experience'>;
    no: Pick<Data['no'], 'nav' | 'experience'>;
  };
  experience: ExperienceItem[];
};

const pageCopy = {
  en: {
    selected: 'Index',
    entries: 'items',
    openSource: 'Open source',
    zed: 'Zed',
    personal: 'Personal',
    projects: 'Projects',
  },
  no: {
    selected: 'Oversikt',
    entries: 'stk.',
    openSource: 'Åpen kildekode',
    zed: 'Zed',
    personal: 'Egne',
    projects: 'Prosjekter',
  },
} as const;

function typeLabel(item: ExperienceItem): string {
  if (item.type === 'pr') return 'Pull request';
  if (item.type === 'zed-extension') return 'Zed extension';
  return 'Repository';
}

export default ilha
  .input<PageInput>()
  .state('data', ({ data }) => data)
  .state('experience', ({ experience }) => experience)
  .render(({ state }) => {
    const data = state.data();
    const loc = data[locale()];
    const copy = pageCopy[locale()];

    const zedItems = state.experience().filter((item) => item.featured);
    const personalItems = state.experience().filter((item) => !item.featured);

    return (
      <section id='experience' class='flex-1'>
        <PageHeader
          marker='02'
          eyebrow={loc.experience.subtitle}
          title={loc.nav.experience}
          description={loc.experience.description}
        />

        <div class='mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10'>
          <div class='mb-10 flex items-center justify-between gap-4 border-b border-border pb-4 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground'>
            <span>{copy.selected}</span>
            <span>
              {state.experience().length.toString().padStart(
                2,
                '0',
              )} {copy.entries}
            </span>
          </div>

          {zedItems.length > 0 && (
            <div class='mb-16'>
              <div class='mb-6'>
                <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                  {copy.openSource}
                </p>
                <h2 class='mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl'>
                  {copy.zed}
                </h2>
              </div>

              <div class='flex flex-col gap-5'>
                {zedItems.map((item, index) => (
                  <ZedContribution
                    item={item}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {personalItems.length > 0 && (
            <div>
              <div class='mb-6'>
                <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                  {copy.personal}
                </p>
                <h2 class='mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl'>
                  {copy.projects}
                </h2>
              </div>

              <div class='divide-y divide-border border-b border-border'>
                {personalItems.map((item, index) => (
                  <article class='group grid gap-5 py-9 sm:grid-cols-[3.5rem_minmax(0,1fr)] lg:grid-cols-[3.5rem_minmax(0,1fr)_15rem] lg:gap-8 lg:py-11'>
                    <div class='font-mono text-[0.6875rem] text-muted-foreground'>
                      /{String(
                        index +
                          zedItems.length +
                          1,
                      ).padStart(2, '0')}
                    </div>

                    <div class='min-w-0'>
                      <div class='mb-3 flex flex-wrap items-center gap-3 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                        <span class='inline-flex items-center gap-2'>
                          <span
                            class='h-2 w-2'
                            style={`background-color:${item.language_color}`}
                          />
                          {item.language}
                        </span>
                        <span aria-hidden='true'>
                          /
                        </span>
                        <span>{typeLabel(item)}</span>
                      </div>

                      <Link
                        href={item.url}
                        class='inline-flex items-center gap-2 text-xl font-bold tracking-[-0.02em] text-foreground no-underline transition-colors hover:text-primary sm:text-2xl'
                        external
                      >
                        {item.name}
                        <Icon
                          node={ArrowUpRight}
                          size={17}
                          class='opacity-50 transition-[opacity,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100'
                        />
                      </Link>

                      <p class='mt-4 max-w-3xl whitespace-pre-line text-[0.9375rem] leading-7 text-muted-foreground'>
                        {item.description}
                      </p>
                    </div>

                    {(Number(item.stars) > 0 || Number(item.forks) > 0) && (
                      <dl class='grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border pt-5 sm:col-start-2 sm:grid-cols-4 lg:col-start-auto lg:grid-cols-2 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8'>
                        {Number(item.stars) > 0 && (
                          <div>
                            <dt class='font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                              Stars
                            </dt>
                            <dd class='mt-1 inline-flex items-center gap-1.5 text-sm font-bold'>
                              <Icon node={Star} size={13} />
                              {formatCompact(item.stars)}
                            </dd>
                          </div>
                        )}
                        {Number(item.forks) > 0 && (
                          <div>
                            <dt class='font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                              Forks
                            </dt>
                            <dd class='mt-1 inline-flex items-center gap-1.5 text-sm font-bold'>
                              <Icon
                                node={GitFork}
                                size={13}
                              />
                              {formatCompact(
                                item.forks,
                              )}
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  });
