import type { LayoutHandler } from "@ilha/router/vite";
import ilha, { html } from "ilha";
import header from "../islands/header";
import { locale } from "../lib/locale";
import { t } from "../locales";

export default ((children) =>
  ilha
    .slot("header", header)
    .slot("children", children)
    .render(({ slots }) => {
      const l = locale();
      const strings = t(l);
      const year = new Date().getFullYear();
      const copyright = strings.footer.copyright.replace("{year}", String(year));

      return html`
        <div class="site-layout">
          ${slots.header()}
          <div class="site-page-content">
            <main style="flex:1">${slots.children()}</main>
            <footer class="site-footer">
              <p>© ${copyright}</p>
            </footer>
          </div>
        </div>
      `;
    })) satisfies LayoutHandler;
