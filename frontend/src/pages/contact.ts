import ilha, { html } from "ilha";
import { createForm, type FormErrors } from "@ilha/form";
import { dataSignal } from "../lib/data";
import { locale } from "../lib/locale";
import z from "zod";

type Status = "idle" | "loading" | "success" | "error";

const emailSchema = z.object({
  full_name: z.string().min(1, "Name is required."),
  email: z.email("Invalid email address."),
  content: z.string().min(1, "Message is required."),
});

export default ilha
  .state("errors", {} as FormErrors)
  .state("status", "idle" as Status)
  .state("message", "")
  .effect(({ host, state }) => {
    const formEl = host.querySelector("form") as HTMLFormElement;
    const form = createForm({
      el: formEl,
      schema: emailSchema,
      validateOn: "change",
      async onSubmit(values) {
        state.status("loading");
        try {
          const res = await fetch("/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          const json = (await res.json()) as { ok: boolean; message: string };
          state.status(json.ok ? "success" : "error");
          state.message(json.message);
          if (json.ok) formEl.reset();
        } catch {
          state.status("error");
          state.message("Network error. Please try again.");
        }
      },
      onError() {
        state.errors(form.errors());
      },
    });
    return form.mount();
  })
  .render(({ state }) => {
    const data = dataSignal()!;
    const loc = data[locale()];
    const { full_name, email, content } = loc.contact;

    const errors = state.errors();
    const status = state.status();
    const message = state.message();

    return html`
      <section class="section" id="contact">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">${loc.nav.contact}</h2>
          </div>
          <div class="glass-card contact-card">
            <form class="contact-form">
              <div class="form-group">
                <label for="full_name">Name</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  placeholder="${full_name}"
                />
                ${errors.full_name
                  ? html`<span class="form-error">${errors.full_name[0]}</span>`
                  : ""}
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="${email}"
                />
                ${errors.email
                  ? html`<span class="form-error">${errors.email[0]}</span>`
                  : ""}
              </div>
              <div class="form-group">
                <label for="content">Message</label>
                <textarea
                  id="content"
                  name="content"
                  placeholder="${content}"
                ></textarea>
                ${errors.content
                  ? html`<span class="form-error">${errors.content[0]}</span>`
                  : ""}
              </div>
              ${status === "error"
                ? html`<p class="form-error">${message}</p>`
                : ""}
              ${status === "success"
                ? html`<p class="form-success">${message}</p>`
                : ""}
              <button
                type="submit"
                class="btn btn-primary"
                ${status === "loading" ? "disabled" : ""}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </section>
    `;
  });
