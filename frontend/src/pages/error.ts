import ilha, { html } from "ilha";

export default ilha.render(() => {
  return html`
    <section id="error" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.5rem;padding:5rem 1rem;text-align:center;min-height:60vh;margin-top:6rem">
      <h1>Error 404: Page Not Found</h1>
      <p>The page you're looking for doesn't exist or something went wrong.</p>
      <a href="/" class="btn btn-primary">Go Home</a>
    </section>
  `;
});
