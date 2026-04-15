import ilha, { html } from "ilha";
import type { Data } from "../types/Data";
import { getData } from "../lib/data";
import { locale } from "../lib/locale";
import { t } from "../locales";

const CRABDASH_URL = "https://github.com/th0jensen/crabdash";
const GITHUB_URL = "https://github.com/th0jensen";
const LINKEDIN_URL = "https://www.linkedin.com/in/thomas-jensen-75a488208/";

function calculateAge(birthday: string): number {
  const [month, day, year] = birthday.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function renderCurrentlyBuilding(text: string) {
  const name = "Crabdash";
  const idx = text.indexOf(name);
  if (idx === -1) {
    return html`${text} <a href="${CRABDASH_URL}" target="_blank" rel="noopener noreferrer">${name}</a>`;
  }
  return html`${text.slice(0, idx)}<a href="${CRABDASH_URL}" target="_blank" rel="noopener noreferrer">${name}</a>${text.slice(idx + name.length)}`;
}

export default ilha
  .state("data", null as Data | null)
  .onMount(({ state }) => {
    getData().then((d) => state.data(d));
  })
  .render(({ state }) => {
    const data = state.data();
    const l = locale();
    const strings = t(l);

    if (!data) return html`<section class="hero-section" id="hero"></section>`;

    const loc = data[l];
    const age = calculateAge(data.about.birthday);
    const description = loc.hero.description.replace("{age}", String(age));
    const name = `${data.about.first_name} ${data.about.last_name}`;

    return html`
      <section class="hero-section" id="hero">
        <!-- Background -->
        <div class="hero-bg-gradient"></div>
        <div class="hero-bg-blob-1"></div>
        <div class="hero-bg-blob-2"></div>

        <!-- Mobile image -->
        <div class="hero-mobile-image">
          <img src="/headshot.webp" alt="Headshot photo of ${name}" width="1200" height="1600" />
        </div>
        <div class="hero-mobile-fade"></div>

        <!-- Content -->
        <div class="container hero-inner">
          <div class="hero-grid">
            <div class="hero-content">
              <p class="hero-eyebrow">${loc.hero.role}</p>
              <h1 class="hero-name">${name}</h1>
              <p class="hero-description">${description}</p>

              <!-- Desktop actions -->
              <div class="hero-actions hero-actions--desktop">
                <a href="/projects" class="btn btn-primary btn-lg" style="min-width:12rem">${loc.hero.explore_work}</a>
                <a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-lg" style="min-width:10rem">
                  ${strings.buttons.github}
                </a>
                <a href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-lg" style="min-width:10rem">
                  ${strings.buttons.linkedin}
                </a>
              </div>

              <!-- Mobile actions -->
              <div class="hero-actions hero-actions--mobile">
                <a href="/projects" class="btn btn-primary btn-lg">${loc.hero.explore_work}</a>
                <div class="social-row">
                  <a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                    ${strings.buttons.github}
                  </a>
                  <a href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                    ${strings.buttons.linkedin}
                  </a>
                </div>
              </div>

              <p class="hero-currently">
                ${renderCurrentlyBuilding(loc.hero.currently_building)}
              </p>
            </div>

            <!-- Portrait -->
            <div class="hero-portrait">
              <img src="/headshot.webp" alt="Headshot photo of ${name}" width="360" height="540" />
            </div>
          </div>
        </div>
      </section>
    `;
  });
