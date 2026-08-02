import { Link } from 'areia';
import { ArrowUpRight, Download } from 'lucide';
import type { ExperienceItem } from '../bindings/index.ts';
import { formatCompact } from '../lib/format.ts';
import Icon from '../lib/icon.tsx';

export default function ZedContribution({
  item,
  index,
}: {
  item: ExperienceItem;
  index: number;
}) {
  const isExtension = item.type === 'zed-extension';
  const typeLabel = item.type === 'pr' ? 'Pull request' : 'Zed extension';

  return (
    <article class='group border border-border bg-card p-6 transition-[border-color,box-shadow] duration-300 hover:border-foreground/25 hover:shadow-[0_24px_60px_-36px_hsl(var(--shadow)/0.5)] sm:p-8'>
      <div class='mb-4 flex flex-wrap items-center justify-between gap-3 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
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
        <span>/0{index + 1}</span>
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

      <div class='mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 font-mono text-[0.6875rem] text-muted-foreground'>
        {item.additions != null && (
          <span>
            +{String(item.additions)} / −{String(item.deletions)} diff
          </span>
        )}
        <span>★ {formatCompact(item.stars)}</span>
        {isExtension && item.downloads != null && (
          <span class='inline-flex items-center gap-1.5'>
            <Icon node={Download} size={13} />
            {formatCompact(item.downloads)}
          </span>
        )}
      </div>
    </article>
  );
}
