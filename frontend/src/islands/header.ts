import ilha, { html, raw } from "ilha";
import { routePath } from "@ilha/router";
import { LOCALES, locale, setLocale } from "../lib/locale";
import { t } from "../locales";
import { ChevronDown, createIcons, Menu, Moon, Sun, X } from "lucide";
import icon from "../lib/icon";

createIcons({
  icons: {
    Sun,
    Moon,
    Menu,
    X,
    ChevronDown,
  },
});

export default ilha
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
    if (code) setLocale(code);
  })
  .render(({ state }) => {
    const path = routePath();
    const isHome = path === "/" || path === "";
    const l = locale();
    const strings = t(l);
    const isDark = state.theme() === "dark";
    const mobileOpen = state.mobileOpen();

    const backdropClass = isHome
      ? "site-header-backdrop"
      : "site-header-backdrop site-header-backdrop--solid";

    const navLinks = [
      { href: "/projects", label: l === "no" ? "Prosjekter" : "Projects" },
      { href: "/experience", label: l === "no" ? "Erfaring" : "Experience" },
      { href: "/contact", label: l === "no" ? "Kontakt" : "Contact" },
    ];

    const localeOptions = LOCALES.map(
      (loc) => html`
        <a
          href="#"
          data-locale="${loc.code}"
          class="locale-option ${l === loc.code ? "locale-option--active" : ""}"
          >${loc.flag} ${loc.label}</a
        >
      `,
    );

    const mobileLinks = [
      ...navLinks,
      { href: "/resume.pdf", label: strings.buttons.resume },
    ];

    return html`
      <div class="site-header-wrap">
        <div class="${backdropClass}"></div>

        <header class="site-header">
          <div class="container site-header__inner">
            <a href="/" class="site-header__name">Thomas Jensen</a>

            <!-- Desktop nav -->
            <nav class="site-nav" aria-label="Main navigation">
              ${navLinks.map(
                (link) => html`
                  <a href="${link.href}" class="nav-link">${link.label}</a>
                `,
              )}
              <a
                href="/resume.pdf"
                class="nav-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${strings.buttons.resume}
              </a>

              <details class="locale-dropdown">
                <summary class="locale-summary">
                  ${LOCALES.find((loc) => loc.code === l)?.flag ?? "🇬🇧"}
                  ${LOCALES.find((loc) => loc.code === l)?.label ?? "English"}
                  ${raw(icon(ChevronDown))}
                </summary>
                <div class="locale-menu">${localeOptions}</div>
              </details>

              <button
                class="theme-toggle"
                data-theme-toggle
                aria-label="${isDark
                  ? strings.theme.light
                  : strings.theme.dark}"
              >
                ${isDark ? raw(icon(Sun)) : raw(icon(Moon))}
              </button>
            </nav>

            <!-- Mobile trigger -->
            <button
              class="mobile-menu-btn"
              data-menu-toggle
              aria-label="${mobileOpen
                ? strings.nav.closeMenu
                : strings.nav.openMenu}"
            >
              ${mobileOpen ? raw(icon(X)) : raw(icon(Menu))}
            </button>
          </div>
        </header>

        <!-- Mobile drawer -->
        <nav
          class="mobile-menu"
          ${mobileOpen ? "" : "hidden"}
          aria-label="Mobile navigation"
        >
          ${mobileLinks.map(
            (link) => html`
              <a href="${link.href}" class="mobile-menu__link" data-menu-close
                >${link.label}</a
              >
            `,
          )}

          <div class="mobile-menu__divider"></div>

          <div class="mobile-menu__locale">
            ${LOCALES.map(
              (loc) => html`
                <a
                  href="#"
                  data-locale="${loc.code}"
                  class="mobile-locale-btn ${l === loc.code
                    ? "mobile-locale-btn--active"
                    : ""}"
                  data-menu-close
                  >${loc.flag} ${loc.label}</a
                >
              `,
            )}
          </div>

          <button class="mobile-menu__theme" data-theme-toggle>
            ${isDark ? raw(icon(Sun)) : raw(icon(Moon))}
            ${isDark ? strings.theme.light : strings.theme.dark}
          </button>
        </nav>
      </div>
    `;
  });
