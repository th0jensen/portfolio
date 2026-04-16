import ilha, { html } from "ilha";
import type { Project } from "../types/Project";
import { getData } from "../lib/data";
import { locale } from "../lib/locale";

function repoCard(project: Project, wide = false) {
  const lang = Object.keys(project.technologies)[0] ?? "";
  const wideClass = wide ? " repo-card--wide" : "";

  const techPills = Object.keys(project.technologies).map(
    (tech) => html`<span class="tech-pill">${tech}</span>`,
  );

  const nameEl = project.source_link
    ? html`<a
        href="${project.source_link}"
        class="repo-card__name"
        target="_blank"
        rel="noopener noreferrer"
        >${project.name}</a
      >`
    : html`<span class="repo-card__name">${project.name}</span>`;

  return html`
    <div class="glass-card repo-card smooth-transition${wideClass}">
      ${nameEl}
      <p class="repo-card__desc">${project.description}</p>
      <div class="tech-pills">${techPills}</div>
      <div class="repo-card__stats">
        <span class="repo-card__lang-dot"></span>
        <span>${lang}</span>
      </div>
    </div>
  `;
}

export default ilha.state("data", getData()).render(({ state }) => {
  const data = state.data();
  const l = locale();

  const loc = data[l];
  const cards = data.projects.map((project, i) => repoCard(project, i === 0));

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
