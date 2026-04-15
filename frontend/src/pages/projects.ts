import ilha, { html } from "ilha";
import type { Data } from "../types/Data";
import type { Project } from "../types/Project";
import { getData } from "../lib/data";
import { locale } from "../lib/locale";
import { t } from "../locales";

function projectCard(project: Project, featured: boolean, visitLabel: string) {
  const hasSrc = project.source_link && project.source_type !== "demo";
  const featuredClass = featured ? " project-card--featured" : "";

  const techPills = Object.keys(project.technologies).map(
    (tech) => html`<span class="tech-pill">${tech}</span>`
  );

  const title = hasSrc
    ? html`<a href="${project.source_link}" class="project-card__name" target="_blank" rel="noopener noreferrer">${project.name}</a>`
    : html`<span class="project-card__name">${project.name}</span>`;

  const overlay = hasSrc
    ? html`
        <div class="project-card__overlay">
          <a href="${project.source_link}" class="project-card__overlay-cta" target="_blank" rel="noopener noreferrer">
            ${visitLabel}
          </a>
        </div>`
    : html`<div class="project-card__overlay"></div>`;

  return html`
    <div class="glass-card project-card smooth-transition${featuredClass}">
      <div class="project-card__media-wrap">
        <div class="project-card__media">
          ${overlay}
          <img
            src="${project.image_url}"
            alt="${project.name}"
            class="project-card__img"
            width="300"
            height="180"
          />
        </div>
      </div>
      <div class="project-card__body">
        ${title}
        <p class="project-card__desc">${project.description}</p>
        <div class="tech-pills">${techPills}</div>
      </div>
    </div>
  `;
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

    if (!data) return html`<section class="section" id="work"><div class="container"></div></section>`;

    const loc = data[l];
    const visitLabel = strings.work.visitProject.replace("{name}", "");

    const cards = data.projects.map((project, i) =>
      html`
        <div class="${i === 0 ? "project-card--featured" : ""}">
          ${projectCard(project, i === 0, visitLabel.trim() || "View project")}
        </div>`
    );

    return html`
      <section class="section" id="work">
        <div class="container">
          <div class="section-header">
            <p class="section-eyebrow">${strings.work.subtitle}</p>
            <h2 class="section-title">${loc.nav.work}</h2>
          </div>
          <div class="project-grid">${cards}</div>
        </div>
      </section>
    `;
  });
