import { Link } from 'areia';
import ilha from 'ilha';
import { ArrowUpRight } from 'lucide';
import Icon from '../lib/icon';
import { locale } from '../lib/locale';

export default ilha.render(() => {
  const year = String(new Date().getFullYear());
  const isNorwegian = locale() === 'no';

  return (
    <footer class='border-t border-border bg-card'>
      <div class='mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-end lg:px-10'>
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
              ? 'Rust-utvikler med fokus på systemarbeid, native verktøy og åpen kildekode.'
              : 'Rust developer focused on systems work, native tooling, and open source.'}
          </p>
          <p class='mt-5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
            Ilha · Areia · Rust · Axum
          </p>
        </div>

        <div class='flex flex-wrap gap-x-6 gap-y-3 md:justify-end'>
          <Link
            href='https://github.com/th0jensen'
            class='inline-flex items-center gap-1.5 text-sm font-bold text-foreground no-underline hover:text-primary'
            external
          >
            GitHub <Icon node={ArrowUpRight} size={13} />
          </Link>
          <Link
            href='https://www.linkedin.com/in/thomas-jensen-75a488208/'
            class='inline-flex items-center gap-1.5 text-sm font-bold text-foreground no-underline hover:text-primary'
            external
          >
            LinkedIn <Icon node={ArrowUpRight} size={13} />
          </Link>
          <Link
            href='/static/resume.pdf'
            class='inline-flex items-center gap-1.5 text-sm font-bold text-foreground no-underline hover:text-primary'
            external
          >
            {isNorwegian ? 'CV' : 'Resume'}
            <Icon node={ArrowUpRight} size={13} />
          </Link>
        </div>
      </div>

      <div class='border-t border-border'>
        <div class='mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-4 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10'>
          <p>© {year} Thomas Jensen</p>
          <p>{isNorwegian ? 'Bygget med omtanke' : 'Built with intent'}</p>
        </div>
      </div>
    </footer>
  );
});
