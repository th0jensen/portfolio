import ilha, { html, raw } from 'ilha';
import { GitFork } from 'lucide';
import type { Data, ExperienceItem } from '../bindings';
import icon from '../lib/icon';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

function formatCompact(n: bigint | number): string {
  const v = typeof n === 'bigint' ? Number(n) : n;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toString();
}

function prBadge(state: string | null | undefined) {
  if (!state) return html``;
  const label = state.charAt(0).toUpperCase() + state.slice(1);
  return html`<span class="pr-badge pr-badge--${state}">${label}</span>`;
}

function experienceCard(item: ExperienceItem) {
  const nameEl = html`<a
    href="${item.url}"
    class="repo-card__name"
    target="_blank"
    rel="noopener noreferrer"
    >${item.name}${
      item.pr_number
        ? html`<span class="repo-card__pr-number">#${item.pr_number}</span>`
        : html``
    }</a
  >`;

  return html`
    <div class="glass-card repo-card smooth-transition">
      ${nameEl}
      <p class="repo-card__desc">${item.description}</p>
      <div class="repo-card__stats">
        <span
          class="repo-card__lang-dot"
          style="background:${item.language_color}"
        ></span>
        <span>${item.language}</span>
        <span class="repo-card__stars">★ ${formatCompact(item.stars)}</span>
        ${
          item.forks
            ? html`<span class="repo-card__stars"
              >${raw(
                icon(
                  GitFork,
                  13,
                  'class="repo-card__stat-icon" aria-hidden="true"',
                ),
              )}${formatCompact(item.forks)}</span
            >`
            : html``
        }
        ${
          item.downloads != null && item.type === 'zed-extension'
            ? html`<span class="repo-card__downloads"
              >↓ ${formatCompact(item.downloads)}</span
            >`
            : html``
        }
        ${
          item.additions != null
            ? html`<span
              class="repo-card__pr-info"
              style="display:inline-flex;align-items:center;gap:0.75rem;margin-left:auto"
              ><span style="display:inline-flex;align-items:center;gap:0.25rem"
                ><span class="pr-additions">+${item.additions}</span
                ><span class="pr-deletions">−${item.deletions}</span></span
              >${prBadge(item.pr_state)}</span
            >`
            : html`<span style="margin-left:auto"
              >${prBadge(item.pr_state)}</span
            >`
        }
      </div>
    </div>
  `;
}

export default ilha
  .state('data', null as Data | null)
  .state('experience', [] as ExperienceItem[])
  .effect(({ state }) => {
    (async () => {
      try {
        const result = await api.data.query();
        state.data(result);
      } catch {}
    })();
    (async () => {
      try {
        const result = await api.experience.query();
        state.experience(result);
      } catch {}
    })();
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return html``;

    const loc = data[locale()];
    const items = state.experience();
    const cards = items.map((item) => experienceCard(item));

    return html`
      <section class="section" id="experience">
        <div class="container">
          <div class="section-header">
            <p class="section-eyebrow">${loc.experience.subtitle}</p>
            <h2 class="section-title section-title--lg">
              ${loc.nav.experience}
            </h2>
            <p class="section-desc">${loc.experience.description}</p>
          </div>
          <div class="repo-grid">${cards}</div>
        </div>
      </section>
    `;
  });
