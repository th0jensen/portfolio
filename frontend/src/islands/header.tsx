import { routePath } from '@ilha/router';
import { Link } from 'areia';
import ilha from 'ilha';
import { ChevronDown, Menu, Moon, Sun, X } from 'lucide';
import type { Data } from '../bindings';
import { cn } from '../lib/cn';
import Icon from '../lib/icon';
import { locale, setLocale } from '../lib/locale';
import api from '../lib/rpc';

type HeaderInput = {
  data?: Data;
};

export default ilha
  .state('data', ({ data }: HeaderInput) => data ?? null)
  .state('mobileOpen', false)
  .state('theme', 'dark' as 'light' | 'dark')
  .state('scrolled', false)
  .effect(({ state }) => {
    if (state.data()) return;
    (async () => {
      try {
        state.data(await api.data.query());
      } catch {}
    })();
  })
  .effect(({ state }) => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    state.theme(saved ?? 'dark');
  })
  .effect(({ state }) => {
    const onScroll = () => state.scrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  })
  .on('[data-theme-toggle]@click', ({ state }) => {
    const next = state.theme() === 'dark' ? 'light' : 'dark';
    state.theme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.style.colorScheme = next;
  })
  .on('[data-menu-toggle]@click', ({ state }) => {
    const next = !state.mobileOpen();
    state.mobileOpen(next);
    document.documentElement.classList.toggle('mobile-nav-open', next);
  })
  .on('[data-menu-close]@click', ({ state }) => {
    state.mobileOpen(false);
    document.documentElement.classList.remove('mobile-nav-open');
  })
  .on('[data-locale]@click', ({ target, event, state }) => {
    event.preventDefault();
    const code = target.getAttribute('data-locale') as 'en' | 'no' | null;
    if (!code) return;

    setLocale(code);
    document.documentElement.dataset.locale = code;
    document.documentElement.lang = code === 'no' ? 'nb' : 'en';
    const details = target.closest('details');
    if (details) details.removeAttribute('open');
    if (state.mobileOpen()) {
      state.mobileOpen(false);
      document.documentElement.classList.remove('mobile-nav-open');
    }
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return '';

    const loc = data[locale()];
    const path = routePath();
    const isDark = state.theme() === 'dark';
    const mobileOpen = state.mobileOpen();
    const activeLocale = data.locales.find((item) => item.code === locale());
    const navLinks = [
      { href: '/projects', label: loc.nav.work, marker: '01' },
      { href: '/experience', label: loc.nav.experience, marker: '02' },
      { href: '/contact', label: loc.nav.contact, marker: '03' },
    ];

    const navLinkClass = (href: string, mobile = false) =>
      cn(
        'group no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background',
        mobile
          ? 'flex items-center justify-between border-b border-border py-5 text-2xl font-bold text-foreground'
          : 'relative flex h-16 items-center px-3 text-sm font-bold text-muted-foreground hover:text-foreground',
        path === href && !mobile && 'text-foreground',
      );

    return (
      <div class='fixed inset-x-0 top-0 z-50'>
        <header
          class={cn(
            'h-16 border-b border-border transition-[background-color,box-shadow] duration-200',
            state.scrolled()
              ? 'bg-background/92 shadow-[0_10px_30px_-24px_hsl(var(--shadow)/0.55)] backdrop-blur-xl'
              : 'bg-background/88 backdrop-blur-md',
          )}
        >
          <div class='mx-auto flex h-full w-full max-w-7xl items-stretch justify-between px-5 sm:px-8 lg:px-10'>
            <a
              href='/'
              class='flex items-center gap-3 text-foreground no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              data-menu-close
              aria-label='Thomas Jensen — home'
            >
              <span class='grid h-8 w-8 place-items-center bg-black font-mono text-[0.625rem] font-bold tracking-[-0.04em] text-white'>
                TJ
              </span>
              <span class='hidden text-base font-bold tracking-[-0.025em] min-[380px]:inline'>
                Thomas Jensen
              </span>
            </a>

            <nav
              class='hidden items-stretch md:flex'
              aria-label='Main navigation'
            >
              {navLinks.map((link) => (
                <Link href={link.href} class={navLinkClass(link.href)}>
                  <span class='mr-1.5 font-mono text-[0.5625rem] font-normal text-muted-foreground/70'>
                    {link.marker}
                  </span>
                  {link.label}
                  {path === link.href && (
                    <span class='absolute inset-x-3 bottom-0 h-0.5 bg-primary' />
                  )}
                </Link>
              ))}

              <Link
                href='/static/resume.pdf'
                class='flex h-16 items-center px-3 text-sm font-bold text-muted-foreground no-underline transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                external
              >
                {loc.buttons.resume}
              </Link>

              <details class='group relative flex items-center [&::-webkit-details-marker]:hidden'>
                <summary class='flex h-16 cursor-pointer list-none items-center gap-1.5 px-3 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                  <span aria-hidden='true'>{activeLocale?.flag ?? '🇬🇧'}</span>
                  {activeLocale?.code ?? 'en'}
                  <Icon
                    node={ChevronDown}
                    size={13}
                    attrs='class="transition-transform group-open:rotate-180"'
                  />
                </summary>
                <div class='absolute top-[calc(100%+0.5rem)] right-0 min-w-40 border border-border bg-card p-1.5 shadow-[0_18px_45px_-22px_hsl(var(--shadow)/0.55)]'>
                  {data.locales.map((item) => (
                    <button
                      type='button'
                      data-locale={item.code}
                      class={cn(
                        'flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                        item.code === locale() && 'text-foreground',
                      )}
                    >
                      <span aria-hidden='true'>{item.flag}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </details>

              <button
                type='button'
                class='my-auto ml-2 grid h-9 w-9 cursor-pointer place-items-center border border-border bg-transparent text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                data-theme-toggle
                aria-label={isDark ? loc.theme.light : loc.theme.dark}
                title={isDark ? loc.theme.light : loc.theme.dark}
              >
                {isDark ? (
                  <Icon node={Sun} size={16} />
                ) : (
                  <Icon node={Moon} size={16} />
                )}
              </button>
            </nav>

            <button
              type='button'
              class='my-auto grid h-9 w-9 cursor-pointer place-items-center border border-border bg-transparent text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden'
              data-menu-toggle
              aria-label={mobileOpen ? loc.nav.close_menu : loc.nav.open_menu}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <Icon node={X} size={18} />
              ) : (
                <Icon node={Menu} size={18} />
              )}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <nav
            class='h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-background px-5 py-5 sm:px-8 md:hidden'
            aria-label='Mobile navigation'
          >
            {navLinks.map((link) => (
              <Link
                href={link.href}
                class={navLinkClass(link.href, true)}
                data-menu-close
              >
                <span>{link.label}</span>
                <span class='font-mono text-[0.6875rem] font-normal text-muted-foreground'>
                  /{link.marker}
                </span>
              </Link>
            ))}
            <Link
              href='/static/resume.pdf'
              class='flex items-center justify-between border-b border-border py-5 text-2xl font-bold text-foreground no-underline'
              external
            >
              {loc.buttons.resume}
              <span class='font-mono text-[0.6875rem] font-normal text-muted-foreground'>
                PDF
              </span>
            </Link>

            <div class='grid grid-cols-2 gap-3 py-6'>
              {data.locales.map((item) => (
                <button
                  type='button'
                  data-locale={item.code}
                  class={cn(
                    'flex cursor-pointer items-center gap-2 border border-border bg-transparent px-4 py-3 text-left text-sm text-muted-foreground',
                    item.code === locale() && 'border-primary text-foreground',
                  )}
                >
                  <span aria-hidden='true'>{item.flag}</span>
                  {item.label}
                </button>
              ))}
              <button
                type='button'
                class='flex cursor-pointer items-center gap-2 border border-border bg-transparent px-4 py-3 text-left text-sm text-foreground'
                data-theme-toggle
              >
                {isDark ? (
                  <Icon node={Sun} size={16} />
                ) : (
                  <Icon node={Moon} size={16} />
                )}
                {isDark ? loc.theme.light : loc.theme.dark}
              </button>
            </div>
          </nav>
        )}
      </div>
    );
  });
