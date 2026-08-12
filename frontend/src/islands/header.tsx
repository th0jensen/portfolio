import ilha from 'ilha';
import { ChevronDown, Menu, Moon, Sun, X } from 'lucide';
import type { Data } from '../bindings/index.ts';
import { cn } from '../lib/cn.ts';
import Icon from '../lib/icon.tsx';
import { locale, setLocale } from '../lib/locale.ts';

type HeaderInput = {
  data: {
    locales: Data['locales'];
    en: HeaderLocale<Data['en']>;
    no: HeaderLocale<Data['no']>;
  };
  path: string;
};

type HeaderLocale<T extends Data['en']> = Pick<T, 'nav' | 'theme'> & {
  buttons: Pick<T['buttons'], 'resume'>;
};

export default ilha
  .input<HeaderInput>()
  .state('data', ({ data }) => data)
  .state('path', ({ path }) => path)
  .state('mobileOpen', false)
  .state('theme', 'dark' as 'light' | 'dark')
  .state('scrolled', false)
  .effect(({ state }) => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    state.theme(saved ?? 'dark');
  })
  .effect(({ state }) => {
    const onScroll = () => state.scrolled(globalThis.scrollY > 8);
    globalThis.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => globalThis.removeEventListener('scroll', onScroll);
  })
  .on('[data-theme-toggle]@click', ({ state }) => {
    const next = state.theme() === 'dark' ? 'light' : 'dark';
    state.theme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.style.colorScheme = next;
  })
  .effect(({ state, signal }) => {
    const openMenus = () =>
      document.querySelectorAll<HTMLDetailsElement>('[data-locale-menu][open]');
    const toggleButton = () => document.querySelector<HTMLElement>('[data-menu-toggle]');

    const closeMobile = () => {
      state.mobileOpen(false);
      document.documentElement.classList.remove('mobile-nav-open');
    };

    const onPointerDown = (event: PointerEvent) => {
      for (const menu of openMenus()) {
        if (!menu.contains(event.target as Node)) menu.removeAttribute('open');
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        for (const menu of openMenus()) {
          menu.removeAttribute('open');
          menu.querySelector('summary')?.focus();
        }
        if (state.mobileOpen()) {
          closeMobile();
          toggleButton()?.focus();
        }
        return;
      }

      if (event.key !== 'Tab' || !state.mobileOpen()) return;

      const panel = document.getElementById('mobile-nav');
      const toggle = toggleButton();
      if (!panel || !toggle) return;

      // The toggle doubles as the panel's close button, so it is part of the
      // cycle rather than an escape hatch out of it.
      const stops = [
        toggle,
        ...panel.querySelectorAll<HTMLElement>('a[href], button'),
      ];
      const first = stops[0];
      const last = stops[stops.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // The panel is md:hidden, so a resize past the breakpoint would otherwise
    // strand both the open state and the scroll lock.
    const onResize = () => {
      if (globalThis.innerWidth >= 768 && state.mobileOpen()) closeMobile();
    };

    document.addEventListener('pointerdown', onPointerDown, { signal });
    document.addEventListener('keydown', onKeyDown, { signal });
    globalThis.addEventListener('resize', onResize, { passive: true, signal });
  })
  .on('[data-menu-toggle]@click', ({ state }) => {
    const next = !state.mobileOpen();
    state.mobileOpen(next);
    document.documentElement.classList.toggle('mobile-nav-open', next);
    if (!next) return;
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('#mobile-nav a')?.focus();
    });
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
    const loc = data[locale()];
    const path = state.path();
    const isDark = state.theme() === 'dark';
    const themeLabel = isDark ? loc.theme.light : loc.theme.dark;
    const themeIcon = isDark ? Sun : Moon;
    const mobileOpen = state.mobileOpen();
    const activeLocale = data.locales.find((item) => item.code === locale());
    const navLinks = [
      { href: '/projects', label: loc.nav.work },
      { href: '/experience', label: loc.nav.experience },
      { href: '/contact', label: loc.nav.contact },
    ];

    const navLinkClass = (href: string, mobile = false) =>
      cn(
        'group no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background',
        mobile
          ? 'flex items-center justify-between border-b border-border py-5 text-2xl font-bold text-foreground'
          : `relative flex h-16 items-center px-3 text-sm font-bold hover:text-foreground ${
            path === href ? 'text-foreground' : 'text-muted-foreground'
          }`,
      );

    return (
      <div class='fixed inset-x-0 top-0 z-50 select-none'>
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
              <span class='hidden text-base font-bold tracking-tight min-[380px]:inline'>
                Thomas Jensen
              </span>
            </a>

            <nav
              class='hidden items-stretch md:flex'
              aria-label='Main navigation'
            >
              {navLinks.map((link) => (
                <a
                  href={link.href}
                  class={navLinkClass(link.href)}
                >
                  {link.label}
                  {path === link.href && (
                    <span class='absolute inset-x-3 bottom-0 h-0.5 bg-primary' />
                  )}
                </a>
              ))}

              <a
                href='/static/resume.pdf'
                class='flex h-16 items-center px-3 text-sm font-bold text-muted-foreground no-underline transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                target='_blank'
                rel='noopener noreferrer'
              >
                {loc.buttons.resume}
              </a>

              <details
                class='group relative flex items-center [&::-webkit-details-marker]:hidden'
                data-locale-menu
              >
                <summary class='flex h-16 cursor-pointer list-none items-center gap-1.5 px-3 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                  <span aria-hidden='true'>
                    {activeLocale?.flag ?? '🇬🇧'}
                  </span>
                  {activeLocale?.code ?? 'en'}
                  <Icon
                    node={ChevronDown}
                    size={13}
                    class='transition-transform group-open:rotate-180'
                  />
                </summary>
                <div class='absolute top-[calc(100%+0.5rem)] right-0 min-w-40 border border-border bg-card p-1.5 shadow-[0_18px_45px_-22px_hsl(var(--shadow)/0.55)]'>
                  {data.locales.map((item) => (
                    <button
                      type='button'
                      data-locale={item.code}
                      class={cn(
                        'flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-muted hover:text-foreground',
                        item.code === locale() ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <span aria-hidden='true'>
                        {item.flag}
                      </span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </details>

              <button
                type='button'
                class='my-auto ml-2 grid h-9 w-9 cursor-pointer place-items-center border border-border bg-transparent text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                data-theme-toggle
                aria-label={themeLabel}
                title={themeLabel}
              >
                <Icon node={themeIcon} size={16} />
              </button>
            </nav>

            <button
              type='button'
              class='my-auto grid h-9 w-9 cursor-pointer place-items-center border border-border bg-transparent text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden'
              data-menu-toggle
              aria-label={mobileOpen ? loc.nav.close_menu : loc.nav.open_menu}
              aria-expanded={mobileOpen ? 'true' : 'false'}
              aria-controls='mobile-nav'
            >
              {mobileOpen ? <Icon node={X} size={18} /> : <Icon node={Menu} size={18} />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <nav
            id='mobile-nav'
            class='h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-background px-5 py-5 sm:px-8 md:hidden'
            aria-label='Mobile navigation'
          >
            {navLinks.map((link) => (
              <a
                href={link.href}
                class={navLinkClass(link.href, true)}
                data-menu-close
              >
                <span>{link.label}</span>
              </a>
            ))}
            <a
              href='/static/resume.pdf'
              class='flex items-center justify-between border-b border-border py-5 text-2xl font-bold text-foreground no-underline'
              target='_blank'
              rel='noopener noreferrer'
            >
              {loc.buttons.resume}
              <span class='font-mono text-[0.6875rem] font-normal text-muted-foreground'>
                PDF
              </span>
            </a>

            <div class='grid grid-cols-2 gap-3 py-6'>
              {data.locales.map((item) => (
                <button
                  type='button'
                  data-locale={item.code}
                  class={cn(
                    'flex cursor-pointer items-center gap-2 border bg-transparent px-4 py-3 text-left text-sm',
                    item.code === locale()
                      ? 'border-primary text-foreground'
                      : 'border-border text-muted-foreground',
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
                <Icon node={themeIcon} size={16} />
                {themeLabel}
              </button>
            </div>
          </nav>
        )}
      </div>
    );
  });
