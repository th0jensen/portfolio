import ilha, { html } from "ilha";
import type { Data } from "../types/Data";
import { getData } from "../lib/data";
import { locale } from "../lib/locale";
import { t } from "../locales";

const GITHUB_URL = "https://github.com/th0jensen";
const LINKEDIN_URL = "https://www.linkedin.com/in/thomas-jensen-75a488208/";

export default ilha
  .state("data", null as Data | null)
  .onMount(({ state }) => {
    getData().then((d) => state.data(d));
  })
  .render(({ state }) => {
    const data = state.data();
    const l = locale();
    const strings = t(l);

    if (!data) return html`<section class="section" id="contact"><div class="container"></div></section>`;
    const navLabel = data[l].nav.contact;
    const metaDesc = data[l].meta.description;

    return html`
      <section class="section" id="contact">
        <div class="container">
          <div class="section-header">
            <p class="section-eyebrow">${navLabel}</p>
            <h2 class="section-title">${navLabel}</h2>
          </div>
          <div class="glass-card contact-card">
            <p class="contact-desc">${metaDesc}</p>
            <div class="contact-actions">
              <a
                href="mailto:${strings.contact.email}"
                class="btn btn-primary btn-lg"
              >${strings.contact.email}</a>
              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary btn-lg"
              >${strings.buttons.resume}</a>
              <a
                href="${GITHUB_URL}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary btn-lg"
              >${strings.buttons.github}</a>
              <a
                href="${LINKEDIN_URL}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary btn-lg"
              >${strings.buttons.linkedin}</a>
            </div>
          </div>
        </div>
      </section>
    `;
  });
