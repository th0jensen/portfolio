import ilha, { html } from "ilha";
import type { ExperienceItem } from "../types/ExperienceItem";
import { dataSignal, experienceSignal } from "../lib/data";
import { locale } from "../lib/locale";

fetch("/api/experience")
  .then((r) => r.json() as Promise<ExperienceItem[]>)
  .then((items) => experienceSignal(items))
  .catch(() => {});

function formatCompact(n: bigint | number): string {
  const v = typeof n === "bigint" ? Number(n) : n;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "m";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
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
    >${item.name}${item.pr_number
      ? html`<span class="repo-card__pr-number">#${item.pr_number}</span>`
      : html``}</a
  >`;

  const prStats =
    item.additions != null
      ? html`<span style="display:inline-flex;align-items:center;gap:0.25rem"><span class="pr-additions">+${item.additions}</span><span class="pr-deletions">−${item.deletions}</span></span>`
      : html``;

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
        ${item.downloads != null && item.type === "zed-extension" ? html`<span class="repo-card__downloads">↓ ${formatCompact(item.downloads)}</span>` : html``}
        ${item.additions != null ? html`<span class="repo-card__pr-info" style="display:inline-flex;align-items:center;gap:0.75rem;margin-left:auto">${prStats}${prBadge(item.pr_state)}</span>` : html`<span style="margin-left:auto">${prBadge(item.pr_state)}</span>`}
      </div>
    </div>
  `;
}

export default ilha.render(() => {
  const data = dataSignal()!;
  const l = locale();
  const loc = data[l];
  const items = experienceSignal() ?? data.experience_items;
  const cards = items.map((item) => experienceCard(item));

  return html`
    <section class="section" id="experience">
      <div class="container">
        <div class="section-header">
          <p class="section-eyebrow">${loc.experience.subtitle}</p>
          <h2 class="section-title section-title--lg">${loc.nav.experience}</h2>
          <p class="section-desc">${loc.experience.description}</p>
        </div>
        <div class="repo-grid">${cards}</div>
      </div>
    </section>
  `;
});
