import { Link } from './link.tsx';
import { ArrowUpRight, Download, Star } from 'lucide';
import type { ExperienceItem } from '../bindings/index.ts';
import { formatCompact } from '../lib/format.ts';
import Icon from '../lib/icon.tsx';
import { useLocale } from '../lib/locale.ts';

type Props = {
  item: ExperienceItem;
  index: number;
};

export default function ZedContribution({ item, index }: Props) {
  const isExtension = item.type === 'zed-extension';
  const typeLabel = item.type === 'pr' ? 'Pull request' : 'Zed extension';
  const additions = Number(item.additions ?? 0);
  const deletions = Number(item.deletions ?? 0);
  const stars = Number(item.stars);
  const downloads = Number(item.downloads ?? 0);
  const hasDiff = additions > 0 || deletions > 0;
  const hasStats = hasDiff || stars > 0 || (isExtension && downloads > 0);
  const labels = useLocale()() === 'no'
    ? { stars: 'Stjerner', downloads: 'Nedlastinger' }
    : { stars: 'Stars', downloads: 'Downloads' };

  const total = additions + deletions;
  const addShare = total > 0 ? (additions / total) * 100 : 0;
  const repo = item.type === 'pr'
    ? 'zed-industries/zed'
    : /github\.com\/([^/]+\/[^/?#]+)/.exec(item.github_url ?? item.url)?.[1] ??
      item.name;

  return (
    <article
      class='glass-card spotlight group flex flex-col transition-shadow duration-300 hover:shadow-[0_24px_60px_-36px_hsl(var(--shadow)/0.5)]'
      data-spotlight
    >
      <div aria-hidden='true' class='glass-lens' data-morph-preserve='style data-glass-active' />
      <div class='flex items-center gap-3 border-b border-border px-4 py-2.5 font-mono text-[0.625rem] text-muted-foreground sm:px-5'>
        <span aria-hidden='true' class='flex gap-1'>
          <span class='size-1.5 bg-border transition-colors duration-300 group-hover:bg-primary' />
          <span class='size-1.5 bg-border' />
          <span class='size-1.5 bg-border' />
        </span>
        <span class='min-w-0 truncate border-x border-border px-2.5 text-foreground/80'>
          {repo}
        </span>
        <span class='ml-auto uppercase tracking-[0.12em]'>/0{index + 1}</span>
      </div>

      <div class='flex-1 p-6 sm:p-8'>
        <div class='mb-4 flex flex-wrap items-center gap-3 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
          <span class='inline-flex flex-wrap items-center gap-2'>
            <span class='text-primary'>Zed</span>
            <span aria-hidden='true'>/</span>
            <span class='inline-flex items-center gap-2'>
              <span
                class='h-2 w-2'
                style={`background-color:${item.language_color}`}
              />
              {item.language}
            </span>
            <span aria-hidden='true'>/</span>
            <span>{typeLabel}</span>
            {item.pr_state && (
              <>
                <span aria-hidden='true'>/</span>
                <span>{item.pr_state}</span>
              </>
            )}
          </span>
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
            class='opacity-50 transition-[opacity,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100'
          />
        </Link>

        <p class='mt-3 max-w-3xl whitespace-pre-line text-[0.9375rem] leading-7 text-muted-foreground'>
          {item.description}
        </p>

        {isExtension &&
          (item.zed_extension_url ||
            (item.github_url && item.github_url !== item.url)) &&
          (
            <div class='mt-5 flex flex-wrap gap-4'>
              {item.zed_extension_url && (
                <a
                  href={item.zed_extension_url}
                  class='font-mono text-[0.6875rem] uppercase tracking-widest text-foreground underline decoration-border underline-offset-4 hover:decoration-primary'
                >
                  Open in Zed
                </a>
              )}
              {item.github_url && item.github_url !== item.url && (
                <Link
                  href={item.github_url}
                  class='font-mono text-[0.6875rem] uppercase tracking-widest text-foreground underline decoration-border underline-offset-4 hover:decoration-primary'
                  external
                >
                  GitHub
                </Link>
              )}
            </div>
          )}
      </div>

      {hasStats && (
        <div class='mx-6 mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 font-mono text-[0.6875rem] text-muted-foreground sm:mx-8 sm:mb-8'>
          {hasDiff && (
            <span class='inline-flex items-center gap-3'>
              <span
                aria-hidden='true'
                class='flex h-1.5 w-20 overflow-hidden bg-muted sm:w-28'
              >
                <span
                  class='h-full bg-diff-addition'
                  style={`width:${addShare.toFixed(1)}%`}
                />
                <span
                  class='h-full bg-diff-deletion'
                  style={`width:${(total > 0 ? 100 - addShare : 0).toFixed(1)}%`}
                />
              </span>
              <span>
                {additions > 0 && (
                  <span class='text-diff-addition'>
                    +<span data-count>{String(item.additions)}</span>
                  </span>
                )}
                {additions > 0 && deletions > 0 && ' / '}
                {deletions > 0 && (
                  <span class='text-diff-deletion'>
                    −<span data-count>{String(item.deletions)}</span>
                  </span>
                )} diff
              </span>
            </span>
          )}
          {stars > 0 && (
            <span class='inline-flex items-center gap-1.5'>
              <Icon node={Star} size={13} />
              <span class='sr-only'>{labels.stars}:</span>{' '}
              <span data-count>{formatCompact(item.stars)}</span>
            </span>
          )}
          {isExtension && downloads > 0 && (
            <span class='inline-flex items-center gap-1.5'>
              <Icon node={Download} size={13} />
              <span class='sr-only'>{labels.downloads}:</span>{' '}
              <span data-count>{formatCompact(downloads)}</span>
            </span>
          )}
        </div>
      )}
    </article>
  );
}
