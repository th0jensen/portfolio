import { ArrowUpRight } from 'lucide';
import Icon from '../lib/icon.tsx';
import { useLocale } from '../lib/locale.ts';
import { reveal } from '../lib/motion.ts';

export default function Footer() {
  const year = String(new Date().getFullYear());
  const isNorwegian = useLocale()() === 'no';
  const channels = [
    ['https://github.com/th0jensen', 'GitHub'],
    ['https://www.linkedin.com/in/thomas-jensen-75a488208/', 'LinkedIn'],
    ['/static/resume.pdf', isNorwegian ? 'CV' : 'Resume'],
  ] as const;

  return (
    <footer class='border-t border-border bg-card'>
      <div
        {...reveal}
        class='mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-end lg:px-10'
      >
        <div>
          <a
            href='/'
            class='inline-flex items-center gap-3 text-foreground no-underline'
          >
            <span class='grid h-8 w-8 place-items-center bg-black font-mono text-[0.625rem] font-bold text-white'>
              TJ
            </span>
            <span class='font-bold tracking-[-0.02em]'>Thomas Jensen</span>
          </a>
          <p class='mt-5 max-w-md text-sm leading-6 text-muted-foreground'>
            {isNorwegian
              ? 'Systemingeniør som jobber med Rust, native programvare og backendinfrastruktur.'
              : 'Systems engineer working with Rust, native software, and backend infrastructure.'}
          </p>
          <div class='mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
            <span>{isNorwegian ? 'Porteføljestack' : 'Portfolio stack'}</span>
            <span class='text-foreground'>Ilha · Effect · Rust · Axum</span>
          </div>
        </div>

        <div class='grid gap-4 md:justify-items-end'>
          <p class='caret font-mono text-[0.6875rem] text-muted-foreground'>
            <span class='text-primary'>$</span>{' '}
            {isNorwegian ? 'åpen --for-roller' : 'open --to-roles'}
          </p>
          <div class='flex flex-wrap gap-x-6 gap-y-3 md:justify-end'>
            {channels.map(([href, label]) => (
              <a
                href={href}
                class='group inline-flex items-center gap-1.5 text-sm font-bold text-foreground no-underline transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                target='_blank'
                rel='noopener noreferrer'
              >
                {label}{' '}
                <Icon
                  node={ArrowUpRight}
                  size={13}
                  class='transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5'
                />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div class='border-t border-border'>
        <div class='mx-auto w-full max-w-7xl px-5 py-4 font-mono text-[0.625rem] uppercase tracking-widest text-muted-foreground sm:px-8 lg:px-10'>
          <p>© {year} Thomas Jensen</p>
        </div>
      </div>
    </footer>
  );
}
