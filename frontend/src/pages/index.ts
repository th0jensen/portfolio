import ilha, { html, raw } from 'ilha';
import { locale } from '../lib/locale';
import api from '../lib/rpc';
import type { Data, NowPlayingTrack } from '../bindings';
import type { Hero } from '../bindings/Hero';

const CRABDASH_URL = 'https://github.com/th0jensen/crabdash';
const GITHUB_URL = 'https://github.com/th0jensen';
const LINKEDIN_URL = 'https://www.linkedin.com/in/thomas-jensen-75a488208/';

function calculateAge(birthday: string): number {
  const [month, day, year] = birthday.split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const nowPlaying = (track: NowPlayingTrack, hero: Hero) =>
  html`${hero.now_playing}:
    <a href="${track.url}" target="_blank" rel="noopener noreferrer"
      >${track.name} ${hero.by} ${track.artist}</a
    >`;

function renderCurrentlyBuilding(text: string) {
  const name = 'Crabdash';
  const idx = text.indexOf(name);
  if (idx === -1) {
    return html`${text}
      <a href="${CRABDASH_URL}" target="_blank" rel="noopener noreferrer"
        >${name}</a
      >`;
  }
  return html`${text.slice(0, idx)}<a
      href="${CRABDASH_URL}"
      target="_blank"
      rel="noopener noreferrer"
      >${name}</a
    >${text.slice(idx + name.length)}`;
}

export default ilha
  .state('data', null as Data | null)
  .state('nowPlaying', null as NowPlayingTrack | null)
  .effect(({ state }) => {
    (async () => {
      try {
        const result = await api.data.query();
        state.data(result);
      } catch {}
    })();
    (async () => {
      try {
        const result = await api.lastfm.query();
        state.nowPlaying(result);
      } catch {}
    })();
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return html``;

    const loc = data[locale()];
    const age = calculateAge(data.about.birthday);
    const description = loc.hero.description.replace('{age}', String(age));
    const name = `${data.about.first_name} ${data.about.last_name}`;

    const headshot = (mobile = false) => html`
      <div class="${mobile ? 'hero-mobile-image' : 'hero-portrait'}">
        <img
          src="/static/headshot.jpg"
          alt="Headshot photo of ${data.about.first_name}"
          fetchpriority="high"
          ${mobile
            ? raw('width=1200 height=1391')
            : raw('width=360 height=418')}
        />
      </div>
    `;

    return html`
      <section class="hero-section" id="hero">
        <!-- Background -->
        <div class="hero-bg-gradient"></div>
        <div class="hero-bg-blob-1"></div>
        <div class="hero-bg-blob-2"></div>

        <!-- Mobile image -->
        ${headshot(true)}
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
                <a
                  href="/projects"
                  class="btn btn-primary btn-lg"
                  style="min-width:12rem"
                  >${loc.hero.explore_work}</a
                >
                <a
                  href="${GITHUB_URL}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-secondary btn-lg"
                  style="min-width:10rem"
                >
                  ${loc.buttons.github}
                </a>
                <a
                  href="${LINKEDIN_URL}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-secondary btn-lg"
                  style="min-width:10rem"
                >
                  ${loc.buttons.linkedin}
                </a>
              </div>

              <!-- Mobile actions -->
              <div class="hero-actions hero-actions--mobile">
                <a href="/projects" class="btn btn-primary btn-lg"
                  >${loc.hero.explore_work}</a
                >
                <div class="social-row">
                  <a
                    href="${GITHUB_URL}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-secondary"
                  >
                    ${loc.buttons.github}
                  </a>
                  <a
                    href="${LINKEDIN_URL}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-secondary"
                  >
                    ${loc.buttons.linkedin}
                  </a>
                </div>
              </div>

              <p class="hero-currently">
                <span
                  >${renderCurrentlyBuilding(loc.hero.currently_building)}</span
                >
                <span
                  >${state.nowPlaying()
                    ? nowPlaying(state.nowPlaying()!, loc.hero)
                    : html``}</span
                >
              </p>
            </div>

            <!-- Portrait -->
            ${headshot()}
          </div>
        </div>
      </section>
    `;
  });
