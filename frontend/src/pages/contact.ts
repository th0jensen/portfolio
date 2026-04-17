import ilha, { html } from "ilha";
import { dataSignal } from "../lib/data";
import { locale } from "../lib/locale";

const GITHUB_URL = "https://github.com/th0jensen";
const LINKEDIN_URL = "https://www.linkedin.com/in/thomas-jensen-75a488208/";

export default ilha.render(() => {
  const data = dataSignal()!;
  const l = locale();

  const loc = data[l];

  return html`
    <section class="section" id="contact">
      <div class="container">
        <div class="section-header">
          <p class="section-eyebrow">${loc.nav.contact}</p>
          <h2 class="section-title">${loc.nav.contact}</h2>
        </div>
        <div class="glass-card contact-card">
          <p class="contact-desc">${loc.meta.description}</p>
          <div class="contact-actions">
            <a href="mailto:${loc.contact.email}" class="btn btn-primary btn-lg"
              >${loc.contact.email}</a
            >
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondary btn-lg"
              >${loc.buttons.resume}</a
            >
            <a
              href="${GITHUB_URL}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondary btn-lg"
              >${loc.buttons.github}</a
            >
            <a
              href="${LINKEDIN_URL}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondary btn-lg"
              >${loc.buttons.linkedin}</a
            >
          </div>
        </div>
      </div>
    </section>
  `;
});
