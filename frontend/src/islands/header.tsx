import { routePath } from '@ilha/router';
import { atom } from 'ilha';
import { ChevronDown, Menu, Moon, Sun, X } from 'lucide';
import { cn } from '../lib/cn.ts';
import Icon from '../lib/icon.tsx';
import { setLocale, useLocale } from '../lib/locale.ts';
import { useServerData } from '../lib/server-data.ts';

export default function Header() {
  const { data } = useServerData(({ data }) => ({
    data: {
      locales: data.locales,
      en: {
        nav: data.en.nav,
        buttons: { resume: data.en.buttons.resume },
        theme: data.en.theme,
      },
      no: {
        nav: data.no.nav,
        buttons: { resume: data.no.buttons.resume },
        theme: data.no.theme,
      },
    },
  }));
  const locale = useLocale();
  const mobileOpen = atom(false);
  const theme = atom<'light' | 'dark'>('dark');
  const scrolled = atom(false);

  const openMenus = () => document.querySelectorAll<HTMLDetailsElement>('[data-locale-menu][open]');
  const toggleButton = () => document.querySelector<HTMLElement>('[data-menu-toggle]');
  const closeMobile = () => {
    mobileOpen.set(false);
    document.documentElement.classList.remove('mobile-nav-open');
  };
  let cleanup: (() => void) | undefined;
  const mountHeader = (host: HTMLDivElement | null) => {
    cleanup?.();
    cleanup = undefined;
    if (!host || typeof window === 'undefined') return;

    const controller = new AbortController();
    const { signal } = controller;
    const saved = localStorage.getItem('theme');
    if ((saved === 'light' || saved === 'dark') && theme() !== saved) {
      theme.set(saved);
    }
    const onScroll = () => {
      const next = globalThis.scrollY > 8;
      if (scrolled() !== next) scrolled.set(next);
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
        if (mobileOpen()) {
          closeMobile();
          toggleButton()?.focus();
        }
        return;
      }
      if (event.key !== 'Tab' || !mobileOpen()) return;
      const panel = document.getElementById('mobile-nav');
      const toggle = toggleButton();
      if (!panel || !toggle) return;
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
    const onResize = () => {
      if (globalThis.innerWidth >= 768 && mobileOpen()) closeMobile();
    };

    globalThis.addEventListener('scroll', onScroll, { passive: true, signal });
    globalThis.addEventListener('resize', onResize, { passive: true, signal });
    document.addEventListener('pointerdown', onPointerDown, { signal });
    document.addEventListener('keydown', onKeyDown, { signal });
    onScroll();
    cleanup = () => controller.abort();
  };
  const toggleTheme = () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    theme.set(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.style.colorScheme = next;
  };
  const toggleMobile = () => {
    const next = !mobileOpen();
    mobileOpen.set(next);
    document.documentElement.classList.toggle('mobile-nav-open', next);
    if (next) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#mobile-nav a')?.focus());
    }
  };
  const selectLocale = (event: MouseEvent) => {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const code = target.dataset.locale as 'en' | 'no' | undefined;
    if (!code) return;
    setLocale(code);
    target.closest('details')?.removeAttribute('open');
    if (mobileOpen()) closeMobile();
  };

  const localeCode = locale();
  const loc = data[localeCode];
  const path = typeof window === 'undefined' ? routePath() : location.pathname;
  const isDark = theme() === 'dark';
  const themeLabel = isDark ? loc.theme.light : loc.theme.dark;
  const themeIcon = isDark ? Sun : Moon;
  const isMobileOpen = mobileOpen();
  const activeLocale = data.locales.find((item) => item.code === localeCode);
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
    <div ref={mountHeader} class='fixed inset-x-0 top-0 z-50 select-none'>
      <header
        class={cn(
          'h-16 border-b border-border transition-[background-color,box-shadow] duration-200',
          scrolled()
            ? 'bg-background/92 shadow-[0_10px_30px_-24px_hsl(var(--shadow)/0.55)] backdrop-blur-xl'
            : 'bg-background/88 backdrop-blur-md',
        )}
      >
        <div class='mx-auto flex h-full w-full max-w-7xl items-stretch justify-between px-5 sm:px-8 lg:px-10'>
          <a
            href='/'
            class='flex items-center gap-3 text-foreground no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            data-menu-close
            onclick={closeMobile}
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
              <a href={link.href} class={navLinkClass(link.href)}>
                {link.label}
                {path === link.href &&
                  <span class='absolute inset-x-3 bottom-0 h-0.5 bg-primary' />}
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
                <span aria-hidden='true'>{activeLocale?.flag ?? '🇬🇧'}</span>
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
                    onclick={selectLocale}
                    class={cn(
                      'flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-muted hover:text-foreground',
                      item.code === localeCode ? 'text-foreground' : 'text-muted-foreground',
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
              onclick={toggleTheme}
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
            onclick={toggleMobile}
            aria-label={isMobileOpen ? loc.nav.close_menu : loc.nav.open_menu}
            aria-expanded={isMobileOpen ? 'true' : 'false'}
            aria-controls='mobile-nav'
          >
            {isMobileOpen ? <Icon node={X} size={18} /> : <Icon node={Menu} size={18} />}
          </button>
        </div>
      </header>

      {isMobileOpen && (
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
              onclick={closeMobile}
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
                onclick={selectLocale}
                class={cn(
                  'flex cursor-pointer items-center gap-2 border bg-transparent px-4 py-3 text-left text-sm',
                  item.code === localeCode
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
              onclick={toggleTheme}
            >
              <Icon node={themeIcon} size={16} />
              {themeLabel}
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
