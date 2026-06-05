import { routePath } from '@ilha/router';
import { Link } from 'areia';
import ilha from 'ilha';
import { ChevronDown, createIcons, Menu, Moon, Sun, X } from 'lucide';
import type { Data } from '../bindings';
import { cn } from '../lib/cn';
import Icon from '../lib/icon';
import { locale, setLocale } from '../lib/locale';
import api from '../lib/rpc';

type HeaderInput = {
  data?: Data;
};

if (typeof document !== 'undefined') {
  createIcons({ icons: { Sun, Moon, Menu, X, ChevronDown } });
}

export default ilha
  .state('data', ({ data }: HeaderInput) => data ?? null)
  .state('mobileOpen', false)
  .state('theme', 'dark' as 'light' | 'dark')
  .state('scrolled', false)
  .effect(({ state }) => {
    if (state.data()) return;
    (async () => {
      try {
        const result = await api.data.query();
        state.data(result);
      } catch {}
    })();
  })
  .effect(({ state }) => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    state.theme(saved ?? 'dark');
  })
  .effect(({ state }) => {
    if (typeof window === 'undefined') return;
    const onScroll = () => state.scrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  })
  .effect(() => {
    const solid = routePath() !== '/';
    document.documentElement.classList.toggle('header-solid', solid);
  })
  .effect(({ state }) => {
    const solid = state.mobileOpen() || state.scrolled() || routePath() !== '/';
    document.documentElement.classList.toggle('header-solid', solid);
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
    if (code) {
      setLocale(code);
      document.documentElement.dataset.locale = code;
    }
    const details = (target as Element).closest('details');
    if (details) details.removeAttribute('open');
    if (state.mobileOpen()) {
      state.mobileOpen(false);
      document.documentElement.classList.remove('mobile-nav-open');
    }
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return <div>Failed to fetch data from backend.</div>;

    const loc = data[locale()];
    const locales = data.locales;
    const isHome = routePath() === '/';
    const isDark = state.theme() === 'dark';
    const mobileOpen = state.mobileOpen();
    const scrolled = state.scrolled();
    const isSolid = !isHome || scrolled || mobileOpen;

    const navLinks = [
      { href: '/projects', label: loc.nav.work },
      { href: '/experience', label: loc.nav.experience },
      { href: '/contact', label: loc.nav.contact },
      { href: '/static/resume.pdf', label: loc.buttons.resume, external: true },
    ];

    const currentLocaleFlag =
      locales.find((lo) => lo.code === locale())?.flag ?? '🇬🇧';
    const currentLocaleLabel =
      locales.find((lo) => lo.code === locale())?.label ?? 'English';

    const navLinkClass = (mobile: boolean) =>
      cn(
        'font-medium cursor-pointer no-underline text-foreground hover:text-foreground rounded-md duration-200 hover:bg-muted transition-[color,background]',
        mobile ? 'block p-4 py-3 text-base' : 'flex px-3 py-1.75 text-sm',
      );

    const LocaleOptions = ({ mobile = false }: { mobile?: boolean }) => (
      <details
        class={cn(
          mobile
            ? 'list-none group'
            : 'relative ml-2 [&::-webkit-details-marker]:hidden',
        )}
      >
        <summary
          class={cn(
            'flex items-center font-medium rounded-md cursor-pointer text-muted-foreground duration-200 hover:text-foreground hover:bg-muted transition-[background,color] list-none',
            mobile
              ? 'justify-between p-4 py-3 [&::-webkit-details-marker]:hidden [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 group-open:[&_svg]:rotate-180 text-base'
              : 'gap-1.5 px-2.5 py-1.25 text-sm',
          )}
        >
          {currentLocaleFlag} {currentLocaleLabel}
          <Icon node={ChevronDown} />
        </summary>
        <div
          class={cn(
            mobile
              ? 'flex flex-col gap-0.5 pb-1'
              : 'absolute top-[calc(100%+0.25rem)] right-0 p-1 bg-card border border-[hsl(var(--border)/0.25)] rounded-2xl shadow-[0_8px_24px_hsl(0_0%_0%/0.1)] min-w-32',
          )}
        >
          {locales
            .filter((lo) => lo.code !== locale())
            .map((lo) => (
              <span data-locale={lo.code} class={navLinkClass(mobile)}>
                {lo.flag} {lo.label}
              </span>
            ))}
        </div>
      </details>
    );

    const RenderNavLinks = ({ mobile = false }: { mobile?: boolean }) =>
      navLinks.map((link) => (
        <Link
          href={link.href}
          class={navLinkClass(mobile)}
          data-menu-close={mobile ? true : undefined}
          external={link.href.includes('resume') && true}
        >
          {link.label}
        </Link>
      ));

    return (
      <div class='fixed top-0 left-0 right-0 z-50 site-header-wrap'>
        <header class='relative z-50 h-16 transition-colors duration-200 site-header'>
          {isSolid && (
            <div class='pointer-events-none absolute inset-0 z-[-1] bg-background/85 border-b border-[hsl(var(--border)_/0.2)] backdrop-blur-2xl'></div>
          )}
          <div class='w-full max-w-6xl mx-auto px-6 flex h-full items-center justify-between'>
            <a
              href='/'
              class='font-medium tracking-[-0.02em] text-initial text-lg no-underline transition-opacity duration-200 hover:opacity-75'
              data-menu-close
            >
              Thomas Jensen
            </a>

            <nav
              class='hidden md:flex items-center gap-0.5'
              aria-label='Main navigation'
            >
              <RenderNavLinks />

              <LocaleOptions />

              <button
                type='button'
                class='flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-none cursor-pointer text-muted-foreground transition-[color,background] duration-200 hover:text-foreground hover:bg-muted ml-2 [&_svg]:w-4.5 [&_svg]:h-4.5'
                data-theme-toggle
                aria-label={isDark ? loc.theme.light : loc.theme.dark}
              >
                {isDark ? <Icon node={Sun} /> : <Icon node={Moon} />}
              </button>
            </nav>

            <button
              type='button'
              class='flex items-center justify-center w-9 h-9 bg-none border-none cursor-pointer text-inherit rounded-lg transition-colors duration-200 hover:bg-muted md:hidden mobile-menu-btn [&_svg]:w-5 [&_svg]:h-5'
              data-menu-toggle
              aria-label={mobileOpen ? loc.nav.close_menu : loc.nav.open_menu}
            >
              {mobileOpen ? <Icon node={X} /> : <Icon node={Menu} />}
            </button>
          </div>
        </header>
        {mobileOpen && (
          <nav
            class='absolute top-full left-3 right-3 z-40 mt-1.5 bg-background/85 backdrop-blur-2xl border border-[hsl(var(--border)/0.2)] rounded-2xl p-2 flex flex-col gap-1 shadow-[0_8px_32px_hsl(0_0%_0%/0.12)] md:hidden'
            aria-label='Mobile navigation'
          >
            <RenderNavLinks mobile />

            <div class='h-px bg-[hsl(var(--border)/0.5)] my-1'></div>

            <LocaleOptions mobile />

            <button
              type='button'
              class='flex items-center gap-3 p-4 py-3 text-base font-medium bg-none border-none cursor-pointer text-foreground rounded-[calc(var(--radius)-2px)] w-full font-inherit transition-colors duration-200 hover:bg-muted [&_svg]:w-4.5 [&_svg]:h-4.5'
              data-theme-toggle
            >
              {isDark ? (
                <Icon node={Sun} size={16} />
              ) : (
                <Icon node={Moon} size={16} />
              )}
              {isDark ? loc.theme.light : loc.theme.dark}
            </button>
          </nav>
        )}
      </div>
    );
  });
