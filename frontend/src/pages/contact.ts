import ilha, { html } from "ilha";
import { createForm, type FormErrors, type StandardSchemaV1 } from "@ilha/form";
import { dataSignal } from "../lib/data";
import { locale } from "../lib/locale";
import type { EmailPayload } from "../types/EmailPayload";

type Status = "idle" | "loading" | "success" | "error";

const emailSchema: StandardSchemaV1<Record<string, unknown>, EmailPayload> = {
  "~standard": {
    version: 1,
    vendor: "contact-form",
    validate(value) {
      const raw = value as Record<string, unknown>;
      const full_name = String(raw.full_name ?? "").trim();
      const email = String(raw.email ?? "").trim();
      const content = String(raw.content ?? "").trim();
      const issues: StandardSchemaV1.Issue[] = [];
      if (!full_name)
        issues.push({ message: "Name is required.", path: ["full_name"] });
      if (!email)
        issues.push({ message: "Email is required.", path: ["email"] });
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        issues.push({ message: "Invalid email address.", path: ["email"] });
      if (!content)
        issues.push({ message: "Message is required.", path: ["content"] });
      if (issues.length) return { issues };
      return { value: { full_name, email, content } };
    },
  },
};

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
    const l = locale();
    const loc = data[l];

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
                <input type="text" id="full_name" name="full_name" />
                ${errors.full_name
                  ? html`<span class="form-error">${errors.full_name[0]}</span>`
                  : ""}
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" />
                ${errors.email
                  ? html`<span class="form-error">${errors.email[0]}</span>`
                  : ""}
              </div>
              <div class="form-group">
                <label for="content">Message</label>
                <textarea id="content" name="content"></textarea>
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
