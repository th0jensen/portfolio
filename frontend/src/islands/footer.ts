import ilha, { html } from "ilha";
import { getData } from "../lib/data";
import type { Data } from "../types/Data";

export default ilha.state("data", getData() as Data).render(({ state }) => {
  const data = state.data();
  const year = String(new Date().getFullYear());
  const copyright = `${year} ${data.about.first_name} ${data.about.last_name}`;

  return html`<footer class="site-footer"><p>© ${copyright}</p></footer>`;
});
