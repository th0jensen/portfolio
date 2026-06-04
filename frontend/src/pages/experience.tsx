import ilha from 'ilha';
import { GitFork } from 'lucide';
import type { Data, ExperienceItem } from '../bindings';
import Icon from '../lib/icon';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
  experience?: ExperienceItem[];
};

function formatCompact(n: bigint | number): string {
  const v = typeof n === 'bigint' ? Number(n) : n;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toString();
}

const PrBadge = ({ state }: { state: string | null | undefined }) => {
  if (!state) return <div></div>;

  const label = state.charAt(0).toUpperCase() + state.slice(1);

  return (
    <span
      class={`ml-auto shrink-0 rounded-full px-2 py-[0.15rem] text-[0.6875rem] font-medium capitalize ${
        state === 'open'
          ? 'bg-[hsl(142_60%_15%_/0.15)] text-[hsl(142_60%_40%)]'
          : state === 'merged'
            ? 'bg-[hsl(265_60%_60%_/0.15)] text-[hsl(265_60%_50%)]'
            : ''
      }`}
    >
      {label}
    </span>
  );
};

const ExperienceCard = ({ item }: { item: ExperienceItem }) => {
  return (
    <div class='flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-2xl transition-all duration-200 ease-in-out hover:border-border/60 hover:shadow-[0_10px_24px_-5px_hsl(0_0%_0%_/0.1)] md:min-h-52 md:[&:nth-(5n+1)]:basis-[calc((100%-1.5rem)/2)] md:[&:nth-(5n+2)]:basis-[calc((100%-1.5rem)/2)] md:[&:nth-(5n+3)]:basis-[calc((100%-3rem)/3)] md:[&:nth-(5n+4)]:basis-[calc((100%-3rem)/3)] md:[&:nth-(5n+5)]:basis-[calc((100%-3rem)/3)]'>
      <a
        href={item.url}
        class='inline-flex items-center gap-1 text-[0.9375rem] font-semibold text-foreground transition-colors hover:text-primary'
        target='_blank'
        rel='noopener noreferrer'
      >
        {item.name}

        {item.pr_number ? (
          <span class='ml-1 font-normal text-muted-foreground'>
            #{item.pr_number}
          </span>
        ) : (
          <div></div>
        )}
      </a>

      <p class='flex-1 whitespace-pre-line text-sm leading-[1.65] text-muted-foreground'>
        {item.description}
      </p>

      <div class='mt-auto flex flex-wrap items-center gap-3 border-t border-border/30 pt-4 text-xs text-muted-foreground'>
        <span
          class='inline-block h-3 w-3 shrink-0 rounded-full'
          style={`background:${item.language_color}`}
        ></span>

        <span>{item.language}</span>

        <span class='inline-flex items-center gap-1 leading-none'>
          ★ {formatCompact(item.stars)}
        </span>

        {item.forks && (
          <span class='inline-flex items-center gap-1 leading-none'>
            <Icon
              node={GitFork}
              size={13}
              attrs='class="block shrink-0 stroke-[2.25]" aria-hidden="true"'
            />
            {formatCompact(item.forks)}
          </span>
        )}

        {item.downloads != null && item.type === 'zed-extension' && (
          <span class='inline-flex items-center gap-1 leading-none'>
            ↓ {formatCompact(item.downloads)}
          </span>
        )}

        {item.additions != null ? (
          <span class='ml-auto inline-flex items-center gap-3'>
            <span class='inline-flex items-center gap-1'>
              <span class='text-[hsl(142_60%_35%)]'>+{item.additions}</span>
              <span class='text-[hsl(0_70%_45%)]'>−{item.deletions}</span>
            </span>

            <PrBadge state={item.pr_state} />
          </span>
        ) : (
          <span class='ml-auto'>
            <PrBadge state={item.pr_state} />
          </span>
        )}
      </div>
    </div>
  );
};

export default ilha
  .state('data', ({ data }: PageInput) => data ?? null)
  .state('experience', ({ experience }: PageInput) => experience ?? [])
  .effect(({ state }) => {
    if (!state.data()) {
      (async () => {
        try {
          const result = await api.data.query();
          state.data(result);
        } catch {}
      })();
    }

    if (state.experience().length === 0) {
      (async () => {
        try {
          const result = await api.experience.query();
          state.experience(result);
        } catch {}
      })();
    }
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return <div></div>;

    const loc = data[locale()];
    const items = state.experience();

    const cards = items.map((item) => <ExperienceCard item={item} />);

    return (
      <section class='py-20' id='experience'>
        <div class='mx-auto w-full max-w-6xl px-6'>
          <div class='mb-12'>
            <p class='mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
              {loc.experience.subtitle}
            </p>

            <h2 class='text-[2.25rem] font-bold tracking-[-0.02em]'>
              {loc.nav.experience}
            </h2>

            <p class='mt-4 max-w-2xl leading-[1.7] text-muted-foreground/90'>
              {loc.experience.description}
            </p>
          </div>

          <div class='flex flex-row flex-wrap gap-6'>{cards}</div>
        </div>
      </section>
    );
  });
