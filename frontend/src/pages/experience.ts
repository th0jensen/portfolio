import ilha, { html } from "ilha";
import type { ExperienceItem } from "../types/ExperienceItem";
import { dataSignal } from "../lib/data";
import { locale } from "../lib/locale";

function prBadge(state: string | null | undefined) {
  if (!state) return html``;
  return html`<span class="pr-badge pr-badge--${state}">${state}</span>`;
}

function experienceCard(item: ExperienceItem) {
  const nameEl = html`<a
    href="${item.url}"
    class="repo-card__name"
    target="_blank"
    rel="noopener noreferrer"
    >${item.name}${item.pr_number ? html`<span class="repo-card__pr-number">#${item.pr_number}</span>` : html``}</a
  >`;

  const prStats =
    item.additions != null
      ? html`<span class="pr-additions">+${item.additions}</span><span class="pr-deletions">−${item.deletions}</span>`
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
        ${prStats}
        ${prBadge(item.pr_state)}
      </div>
    </div>
  `;
}

export default ilha.render(() => {
  const data = dataSignal()!;
  const l = locale();
  const loc = data[l];
  const cards = data.experience_items.map((item) => experienceCard(item));

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
