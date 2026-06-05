import { LayerCard, Link } from 'areia';
import ilha from 'ilha';
import { GitFork } from 'lucide';
import type { Data, ExperienceItem } from '../bindings';
import { cn } from '../lib/cn';
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
      class={cn(
        'shrink-0 rounded-full px-2 py-[0.15rem] text-[0.6875rem] font-medium capitalize',
        state === 'open' &&
          'bg-[hsl(142_60%_15%_/0.15)] text-[hsl(142_60%_40%)]',
        state === 'merged' &&
          'bg-[hsl(265_60%_60%_/0.15)] text-[hsl(265_60%_50%)]',
      )}
    >
      {label}
    </span>
  );
};

const ExperienceCard = ({ item }: { item: ExperienceItem }) => (
  <LayerCard class='flex h-full flex-col transition-all duration-200 ease-in-out hover:shadow-[0_10px_24px_-5px_hsl(0_0%_0%_/0.1)]'>
    <LayerCard.Title>
      <div class='flex w-full items-center justify-between gap-3 text-xs text-muted-foreground'>
        <div class='flex items-center gap-3'>
          <span
            class='inline-block h-3 w-3 shrink-0 rounded-full'
            style={`background:${item.language_color}`}
          />
          <span>{item.language}</span>
          <span class='inline-flex items-center gap-1'>
            ★ {formatCompact(item.stars)}
          </span>
          {item.forks && (
            <span class='inline-flex items-center gap-1'>
              <Icon
                node={GitFork}
                size={13}
                attrs='class="block shrink-0 stroke-[2.25]" aria-hidden="true"'
              />
              {formatCompact(item.forks)}
            </span>
          )}
          {item.downloads != null && item.type === 'zed-extension' && (
            <span class='inline-flex items-center gap-1'>
              ↓ {formatCompact(item.downloads)}
            </span>
          )}
        </div>
        {item.additions != null ? (
          <div class='inline-flex items-center gap-3'>
            <span class='inline-flex items-center gap-1'>
              <span class='text-[hsl(142_60%_35%)]'>+{item.additions}</span>
              <span class='text-[hsl(0_70%_45%)]'>−{item.deletions}</span>
            </span>
            <PrBadge state={item.pr_state} />
          </div>
        ) : (
          <PrBadge state={item.pr_state} />
        )}
      </div>
    </LayerCard.Title>
    <LayerCard.Content class='flex flex-1 flex-col gap-3 p-6'>
      <Link
        href={item.url}
        class='inline-flex items-center gap-1 text-[0.9375rem] font-semibold text-foreground hover:text-foreground no-underline transition-colors hover:underline'
        external
      >
        {item.name}
        {item.pr_number && (
          <span class='ml-1 font-normal text-muted-foreground'>
            #{item.pr_number}
          </span>
        )}
      </Link>
      <p class='flex-1 whitespace-pre-line text-sm leading-[1.65] text-muted-foreground'>
        {item.description}
      </p>
    </LayerCard.Content>
  </LayerCard>
);

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
    if (!data) return <div></div>;

    const loc = data[locale()];

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

          <div class='grid grid-cols-1 gap-8 md:grid-cols-2'>
            {state.experience().map((item) => (
              <ExperienceCard item={item} />
            ))}
          </div>
        </div>
      </section>
    );
  });
