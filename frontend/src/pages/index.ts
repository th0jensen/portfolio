import ilha, { html, raw } from 'ilha';
import type { Data, NowPlayingTrack } from '../bindings';
import type { Hero } from '../bindings/Hero';
import type { SocialButton } from '../bindings/SocialButton';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
};

function calculateAge(birthday: string): number {
  const [month, day, year] = birthday.split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const button = (item: SocialButton, styles?: string) =>
  html`<a
    href="${item.url}"
    target="_blank"
    rel="noopener noreferrer"
    class="btn btn-secondary"
    ${styles && `style="${styles}"`}
  >
    ${item.label}
  </a>`;

const nowPlaying = (track: NowPlayingTrack | null, hero: Hero) => {
  if (track === null) return html``;
  return html`${hero.now_playing}:
    <a href="${track.url}" target="_blank" rel="noopener noreferrer"
      >${track.name} ${hero.by} ${track.artist}</a
    >`;
};

function renderCurrentlyBuilding(text: string, url: string) {
  const name = 'Crabdash';
  const idx = text.indexOf(name);
  if (idx === -1) {
    return html`${text}
      <a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`;
  }
  return html`${text.slice(0, idx)}<a
      href="${url}"
      target="_blank"
      rel="noopener noreferrer"
      >${name}</a
    >${text.slice(idx + name.length)}`;
}

export default ilha
  .state('data', ({ data }: PageInput) => data ?? null)
  .state('nowPlaying', null as NowPlayingTrack | null)
  .effect(({ state }) => {
    if (!state.data()) {
      (async () => {
        try {
          const result = await api.data.query();
          state.data(result);
        } catch {}
      })();
    }
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
          ${
            mobile ? raw('width=1200 height=1391') : raw('width=360 height=418')
          }
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
                ${button(loc.buttons.github, 'min-width:10rem')}
                ${button(loc.buttons.linkedin, 'min-width:10rem')}
              </div>

              <!-- Mobile actions -->
              <div class="hero-actions hero-actions--mobile">
                <a href="/projects" class="btn btn-primary btn-lg"
                  >${loc.hero.explore_work}</a
                >
                <div class="social-row">
                  ${button(loc.buttons.github)} ${button(loc.buttons.linkedin)}
                </div>
              </div>

              <p class="hero-currently">
                <span
                  >${renderCurrentlyBuilding(
                    loc.hero.currently_building,
                    data.projects[1].source_link,
                  )}</span
                >
                <span
                  >${nowPlaying(state.nowPlaying(), loc.hero)}</span
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
