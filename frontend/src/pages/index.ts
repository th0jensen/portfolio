import ilha, { html, raw } from 'ilha';
import { dataSignal } from '../lib/data';
import { locale } from '../lib/locale';

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

async function nowPlaying() {
  const track = await fetch('/api/scrobbling');
  if (!track.ok) {
    return html``;
  }
}

export default ilha.render(() => {
  const data = dataSignal()!;
  const l = locale();

  const loc = data[l];
  const age = calculateAge(data.about.birthday);
  const description = loc.hero.description.replace('{age}', String(age));
  const name = `${data.about.first_name} ${data.about.last_name}`;

  const headshot = (mobile = false) => html`
    <div class="${mobile ? 'hero-mobile-image' : 'hero-portrait'}">
      <img
        src="/static/headshot.jpg"
        alt="Headshot photo of ${data.about.first_name}"
        fetchpriority="high"
        ${mobile ? raw('width=1200 height=1391') : raw('width=360 height=418')}
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
              ${renderCurrentlyBuilding(loc.hero.currently_building)}
            </p>
          </div>

          <!-- Portrait -->
          ${headshot()}
        </div>
      </div>
    </section>
  `;
});
