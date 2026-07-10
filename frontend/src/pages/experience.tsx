import { Link } from 'areia';
import ilha from 'ilha';
import { ArrowUpRight, Download, GitFork } from 'lucide';
import type { Data, ExperienceItem } from '../bindings';
import Icon from '../lib/icon';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
  experience?: ExperienceItem[];
};

function formatCompact(value: bigint | number): string {
  const number = typeof value === 'bigint' ? Number(value) : value;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}m`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}k`;
  return String(number);
}

function typeLabel(item: ExperienceItem): string {
  if (item.type === 'pr') return 'Pull request';
  if (item.type === 'zed-extension') return 'Zed extension';
  return 'Repository';
}

export default ilha
  .state('data', ({ data }: PageInput) => data ?? null)
  .state('experience', ({ experience }: PageInput) => experience ?? [])
  .effect(({ state }) => {
    (async () => {
      try {
        if (!state.data()) state.data(await api.data.query());
      } catch {}
    })();

    (async () => {
      try {
        state.experience(await api.experience.query());
      } catch {}
    })();
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return '';

    const loc = data[locale()];
    const isNorwegian = locale() === 'no';

    return (
      <section id='experience' class='flex-1'>
        <header class='relative overflow-hidden border-b border-border py-16 sm:py-20'>
          <div class='technical-grid absolute inset-0 opacity-35' />
          <div class='absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--background)/0.98),hsl(var(--background)/0.78))]' />
          <div class='relative mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:items-end lg:px-10'>
            <div>
              <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                02 / {loc.experience.subtitle}
              </p>
              <h1 class='mt-4 text-5xl font-bold tracking-[-0.055em] sm:text-6xl'>
                {loc.nav.experience}
              </h1>
            </div>
            <p class='max-w-2xl text-lg leading-8 text-muted-foreground md:justify-self-end'>
              {loc.experience.description}
            </p>
          </div>
        </header>

        <div class='mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10'>
          <div class='mb-8 flex items-center justify-between gap-4 border-b border-border pb-4 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground'>
            <span>{isNorwegian ? 'Utvalgt arbeid' : 'Selected work'}</span>
            <span>
              {state.experience().length.toString().padStart(2, '0')} entries
            </span>
          </div>

          <div class='divide-y divide-border border-b border-border'>
            {state.experience().map((item, index) => (
              <article class='group grid gap-5 py-9 sm:grid-cols-[3.5rem_minmax(0,1fr)] lg:grid-cols-[3.5rem_minmax(0,1fr)_15rem] lg:gap-8 lg:py-11'>
                <div class='font-mono text-[0.6875rem] text-muted-foreground'>
                  /{String(index + 1).padStart(2, '0')}
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
                    <span class='text-border'>/</span>
                    <span>{typeLabel(item)}</span>
                    {item.pr_state && (
                      <>
                        <span class='text-border'>/</span>
                        <span class='text-primary'>{item.pr_state}</span>
                      </>
                    )}
                  </div>

                  <Link
                    href={item.url}
                    class='inline-flex items-center gap-2 text-xl font-bold tracking-[-0.02em] text-foreground no-underline transition-colors hover:text-primary sm:text-2xl'
                    external
                  >
                    {item.name}
                    {item.pr_number && (
                      <span class='font-mono text-sm font-normal text-muted-foreground'>
                        #{String(item.pr_number)}
                      </span>
                    )}
                    <Icon
                      node={ArrowUpRight}
                      size={17}
                      attrs='class="opacity-50 transition-[opacity,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"'
                    />
                  </Link>

                  <p class='mt-4 max-w-3xl whitespace-pre-line text-[0.9375rem] leading-7 text-muted-foreground'>
                    {item.description}
                  </p>

                  {item.type === 'zed-extension' && (
                    <div class='mt-5 flex flex-wrap gap-4'>
                      {item.zed_extension_url && (
                        <a
                          href={item.zed_extension_url}
                          class='font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-foreground underline decoration-border underline-offset-4 hover:decoration-primary'
                        >
                          Open in Zed
                        </a>
                      )}
                      {item.github_url && item.github_url !== item.url && (
                        <Link
                          href={item.github_url}
                          class='font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-foreground underline decoration-border underline-offset-4 hover:decoration-primary'
                          external
                        >
                          GitHub
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                <dl class='grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border pt-5 sm:col-start-2 sm:grid-cols-4 lg:col-start-auto lg:grid-cols-2 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8'>
                  <div>
                    <dt class='font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                      Stars
                    </dt>
                    <dd class='mt-1 text-sm font-bold'>
                      ★ {formatCompact(item.stars)}
                    </dd>
                  </div>
                  {Number(item.forks) > 0 && (
                    <div>
                      <dt class='font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                        Forks
                      </dt>
                      <dd class='mt-1 inline-flex items-center gap-1.5 text-sm font-bold'>
                        <Icon node={GitFork} size={13} />
                        {formatCompact(item.forks)}
                      </dd>
                    </div>
                  )}
                  {item.downloads != null && item.type === 'zed-extension' && (
                    <div>
                      <dt class='font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                        Downloads
                      </dt>
                      <dd class='mt-1 inline-flex items-center gap-1.5 text-sm font-bold'>
                        <Icon node={Download} size={13} />
                        {formatCompact(item.downloads)}
                      </dd>
                    </div>
                  )}
                  {item.additions != null && (
                    <div>
                      <dt class='font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                        Diff
                      </dt>
                      <dd class='mt-1 font-mono text-xs'>
                        <span class='text-[hsl(142_55%_40%)]'>
                          +{String(item.additions)}
                        </span>{' '}
                        <span class='text-[hsl(2_62%_54%)]'>
                          −{String(item.deletions)}
                        </span>
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  });
