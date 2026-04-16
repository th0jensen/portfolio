import ilha, { html, raw } from "ilha";
import { LOCALES, locale, setLocale } from "../lib/locale";
import { ChevronDown, createIcons, Menu, Moon, Sun, X } from "lucide";
import icon from "../lib/icon";
import type { Data } from "../types/Data";
import { getData } from "../lib/data";

if (typeof document !== "undefined") {
  createIcons({ icons: { Sun, Moon, Menu, X, ChevronDown } });
}

export default ilha
  .state("data", getData() as Data)
  .state("mobileOpen", false)
  .state("theme", "dark" as "light" | "dark")
  .effect(({ state }) => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    state.theme(saved ?? "dark");
  })
  .on("[data-theme-toggle]@click", ({ state }) => {
    const next = state.theme() === "dark" ? "light" : "dark";
    state.theme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
  })
  .on("[data-menu-toggle]@click", ({ state }) => {
    const next = !state.mobileOpen();
    state.mobileOpen(next);
    document.documentElement.classList.toggle("mobile-nav-open", next);
  })
  .on("[data-menu-close]@click", ({ state }) => {
    state.mobileOpen(false);
    document.documentElement.classList.remove("mobile-nav-open");
  })
  .on("[data-locale]@click", ({ target }) => {
    const code = target.getAttribute("data-locale") as "en" | "no" | null;
    if (code) {
      setLocale(code);
      document.documentElement.dataset.locale = code;
    }
  })
  .render(({ state }) => {
    const data = state.data();
    const l = locale();
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    const isHome = path === "/" || path === "";
    const isDark = state.theme() === "dark";
    const mobileOpen = state.mobileOpen();

    const loc = data[l];

    const navLinks = [
      { href: "/projects", label: loc.nav.work },
      { href: "/experience", label: loc.nav.experience },
      { href: "/contact", label: loc.nav.contact },
      { href: "/static/resume.pdf", label: loc.buttons.resume, external: true },
    ];

    const currentLocaleFlag = LOCALES.find((lo) => lo.code === l)?.flag ?? "🇬🇧";
    const currentLocaleLabel =
      LOCALES.find((lo) => lo.code === l)?.label ?? "English";
    const localeOptions = LOCALES.map(
      (lo) => html`
        <a
          href="#"
          data-locale="${lo.code}"
          class="locale-option ${l === lo.code ? "locale-option--active" : ""}"
          >${lo.flag} ${lo.label}</a
        >
      `,
    );

    const renderNavLinks = (mobile = false) =>
      navLinks.map(
        (link) => html`
          <a
            href="${link.href}"
            class="${mobile ? "mobile-menu__link" : "nav-link"}"
            ${link.external
              ? raw('target="_blank" rel="noopener noreferrer"')
              : ""}
            ${mobile ? "data-menu-close" : ""}
            >${link.label}</a
          >
        `,
      );

    const backdropClass = `site-header-backdrop${isHome ? "" : " site-header-backdrop--solid"}`;

    return html`
      <div class="site-header-wrap">
        <div class="${backdropClass}"></div>

        <header class="site-header">
          <div class="container site-header__inner">
            <a href="/" class="site-header__name">Thomas Jensen</a>

            <nav class="site-nav" aria-label="Main navigation">
              ${renderNavLinks()}

              <details class="locale-dropdown">
                <summary class="locale-summary">
                  ${currentLocaleFlag} ${currentLocaleLabel}
                  ${raw(icon(ChevronDown))}
                </summary>
                <div class="locale-menu">${localeOptions}</div>
              </details>

              <button
                class="theme-toggle"
                data-theme-toggle
                aria-label="${isDark ? loc.theme.light : loc.theme.dark}"
              >
                ${isDark ? raw(icon(Sun)) : raw(icon(Moon))}
              </button>
            </nav>

            <button
              class="mobile-menu-btn"
              data-menu-toggle
              aria-label="${mobileOpen
                ? loc.nav.close_menu
                : loc.nav.open_menu}"
            >
              ${mobileOpen ? raw(icon(X)) : raw(icon(Menu))}
            </button>
          </div>
        </header>

        <nav
          class="mobile-menu"
          ${mobileOpen ? "" : "hidden"}
          aria-label="Mobile navigation"
        >
          ${renderNavLinks(true)}

          <div class="mobile-menu__divider"></div>

          <div class="mobile-menu__locale">
            ${LOCALES.map(
              (lo) => html`
                <a
                  href="#"
                  data-locale="${lo.code}"
                  class="mobile-locale-btn ${l === lo.code
                    ? "mobile-locale-btn--active"
                    : ""}"
                  data-menu-close
                  >${lo.flag} ${lo.label}</a
                >
              `,
            )}
          </div>

          <button class="mobile-menu__theme" data-theme-toggle>
            ${isDark ? raw(icon(Sun)) : raw(icon(Moon))}
            ${isDark ? loc.theme.light : loc.theme.dark}
          </button>
        </nav>
      </div>
    `;
  });
