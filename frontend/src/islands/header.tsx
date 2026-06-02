import { routePath } from '@ilha/router';
import ilha, { html } from 'ilha';
import { ChevronDown, createIcons, Menu, Moon, Sun, X } from 'lucide';
import type { Data } from '../bindings';
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
    // Close the locale <details> dropdown
    const details = (target as Element).closest('details');
    if (details) details.removeAttribute('open');
    // Close mobile menu if open
    if (state.mobileOpen()) {
      state.mobileOpen(false);
      document.documentElement.classList.remove('mobile-nav-open');
    }
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return html``;

    const loc = data[locale()];
    const locales = data.locales;
    const isHome = routePath() === '/';
    const isDark = state.theme() === 'dark';
    const mobileOpen = state.mobileOpen();
    const scrolled = state.scrolled();
    const isSolid = !isHome || scrolled || mobileOpen;
    const wrapClass = `site-header-wrap${isSolid ? '' : ' site-header-wrap--mobile-transparent'}`;

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

    const localeOptions = (mobile = false) =>
      locales
        .filter((lo) => lo.code !== locale())
        .map(
          (lo) => html`
            <a
              href="#"
              data-locale="${lo.code}"
              class="${mobile ? 'mobile-menu__link' : 'locale-option'}"
              >${lo.flag} ${lo.label}</a
            >
          `,
        );

    const renderNavLinks = (mobile = false) =>
      navLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className={mobile ? 'mobile-menu__link' : 'nav-link'}
          target={link.external ? '_blank' : undefined}
          rel={link.external ? 'noopener noreferrer' : undefined}
          {...(mobile ? { 'data-menu-close': true } : {})}
        >
          {link.label}
        </a>
      ));

    return (
      <div class={wrapClass}>
        <div class='site-header-backdrop site-header-backdrop--solid'></div>

        <header class='site-header'>
          <div class='container site-header__inner'>
            <a href='/' class='site-header__name' data-menu-close>
              Thomas Jensen
            </a>

            <nav class='site-nav' aria-label='Main navigation'>
              {renderNavLinks()}

              <details class='locale-dropdown'>
                <summary class='locale-summary'>
                  {currentLocaleFlag} {currentLocaleLabel}
                  <Icon node={ChevronDown} />
                </summary>
                <div class='locale-menu'>{localeOptions()}</div>
              </details>

              <button
                type='button'
                class='theme-toggle'
                data-theme-toggle
                aria-label={isDark ? loc.theme.light : loc.theme.dark}
              >
                {isDark ? <Icon node={Sun} /> : <Icon node={Moon} />}
              </button>
            </nav>

            <button
              type='button'
              class='mobile-menu-btn'
              data-menu-toggle
              aria-label={mobileOpen ? loc.nav.close_menu : loc.nav.open_menu}
            >
              {mobileOpen ? <Icon node={X} /> : <Icon node={Menu} />}
            </button>
          </div>
        </header>

        <nav
          className={`mobile-menu ${mobileOpen ? '' : 'hidden'}`}
          aria-label='Mobile navigation'
        >
          {renderNavLinks(true)}
          <div class='mobile-menu__divider'></div>
          <details class='mobile-locale-details'>
            <summary class='mobile-locale-summary'>
              <span>
                {currentLocaleFlag} {currentLocaleLabel}
              </span>
              <Icon node={ChevronDown} />
            </summary>
            <div class='mobile-locale-submenu'>{localeOptions(true)}</div>
          </details>

          <button type='button' class='mobile-menu__theme' data-theme-toggle>
            {isDark ? <Icon node={Sun} /> : <Icon node={Moon} />}
            {isDark ? loc.theme.light : loc.theme.dark}
          </button>
        </nav>
      </div>
    );
  });
