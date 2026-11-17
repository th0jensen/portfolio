import { atom, h } from 'ilha';
import { ChevronDown, Menu, Moon, Sun, X } from 'lucide';
import { cn } from '../lib/cn.ts';
import Icon from '../lib/icon.tsx';
import { setLocale, useLocale } from '../lib/locale.ts';
import { useServerData } from '../lib/server-data.ts';

export default function Header({ path }: { path: string }) {
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
  const isDark = theme() === 'dark';
  const themeLabel = isDark ? loc.theme.light : loc.theme.dark;
  const isMobileOpen = mobileOpen();
  const activeLocale = data.locales.find((item) => item.code === localeCode);
  const navLinks = [
    { href: '/projects', label: loc.nav.work },
    { href: '/experience', label: loc.nav.experience },
    { href: '/contact', label: loc.nav.contact },
  ];

  const navLinkClass = (href: string) =>
    cn(
      'nav-link relative flex h-16 items-center px-3 text-sm font-bold no-underline transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background',
      path === href ? 'text-foreground' : 'text-muted-foreground',
    );
  const mobileLinkClass =
    'group flex items-baseline gap-4 border-b border-border py-5 text-3xl font-bold tracking-tight text-foreground no-underline transition-[opacity,translate,color] duration-500 ease-(--ease-out) hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:starting:translate-y-4 motion-safe:starting:opacity-0';
  const mobileIndex = (index: number) => (
    <span class='w-6 shrink-0 font-mono text-[0.6875rem] font-normal tracking-[0.08em] text-muted-foreground transition-colors group-hover:text-primary'>
      {String(index + 1).padStart(2, '0')}
    </span>
  );
  const themeGlyph = () => (
    <span class='relative block h-4 w-4 shrink-0 [&_svg]:absolute [&_svg]:inset-0 [&_svg]:transition-[rotate,scale,opacity] [&_svg]:duration-300 [&_svg]:ease-(--ease-out)'>
      <Icon
        node={Sun}
        size={16}
        class={isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}
      />
      <Icon
        node={Moon}
        size={16}
        class={isDark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}
      />
    </span>
  );

  return (
    <div ref={mountHeader} class='fixed inset-x-0 top-0 z-50 select-none'>
      <svg aria-hidden='true' class='absolute h-0 w-0 overflow-hidden'>
        <defs>
          {/* Filter primitives render normally but aren't in Ilha's JSX tag list. */}
          {h(
            'filter',
            {
              id: 'header-edge-refraction',
              'color-interpolation-filters': 'sRGB',
            },
            h('feOffset', {
              in: 'SourceGraphic',
              dy: '-3',
            }),
          )}
        </defs>
      </svg>
      <div aria-hidden='true' class='header-glass-edge' />
      <header
        data-site-header
        class={cn(
          'relative h-16 border-b border-transparent transition-[background-color,box-shadow] duration-200',
          scrolled()
            ? 'bg-background/80 shadow-[0_10px_30px_-24px_hsl(var(--shadow)/0.55)] backdrop-blur-md'
            : 'bg-background/65 backdrop-blur-[2px]',
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
            <span
              class='hidden border-l border-border pl-3 font-mono text-[0.625rem] tracking-[0.04em] text-muted-foreground lg:inline'
              aria-hidden='true'
            >
              ~{path === '/' ? '' : path}
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
                aria-current={path === link.href ? 'page' : undefined}
              >
                {link.label}
              </a>
            ))}

            <a
              href='/static/resume.pdf'
              class={navLinkClass('/static/resume.pdf')}
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
              {themeGlyph()}
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
        <span
          class='scroll-progress pointer-events-none absolute inset-x-0 -bottom-px h-px bg-primary'
          aria-hidden='true'
        />
      </header>

      {isMobileOpen && (
        <nav
          id='mobile-nav'
          class='h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-background px-5 py-5 sm:px-8 md:hidden'
          aria-label='Mobile navigation'
        >
          {navLinks.map((link, index) => (
            <a
              href={link.href}
              class={mobileLinkClass}
              style={`transition-delay:${index * 60}ms,${index * 60}ms,0ms`}
              data-menu-close
              onclick={closeMobile}
              aria-current={path === link.href ? 'page' : undefined}
            >
              {mobileIndex(index)}
              <span class={path === link.href ? 'text-primary' : undefined}>{link.label}</span>
            </a>
          ))}
          <a
            href='/static/resume.pdf'
            class={mobileLinkClass}
            style={`transition-delay:${navLinks.length * 60}ms,${navLinks.length * 60}ms,0ms`}
            target='_blank'
            rel='noopener noreferrer'
          >
            {mobileIndex(navLinks.length)}
            {loc.buttons.resume}
            <span class='ml-auto font-mono text-[0.6875rem] font-normal text-muted-foreground'>
              PDF
            </span>
          </a>

          <div
            class='grid grid-cols-2 gap-3 py-6 transition-[opacity,translate] duration-500 ease-(--ease-out) motion-safe:starting:translate-y-4 motion-safe:starting:opacity-0'
            style={`transition-delay:${(navLinks.length + 1) * 60}ms`}
          >
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
              {themeGlyph()}
              {themeLabel}
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
