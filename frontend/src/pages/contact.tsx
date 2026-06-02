import { createStore } from '@ilha/store';
import {
  extractFormData,
  type FormErrors,
  issuesToErrors,
  validateWithSchema,
} from '@ilha/store/form';
import ilha from 'ilha';
import z from 'zod';
import type { Data } from '../bindings';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
};

type Status = 'idle' | 'loading' | 'success' | 'error';

const emailSchema = z.object({
  full_name: z.string().min(1, 'Name is required.'),
  email: z.email('Invalid email address.'),
  content: z.string().min(1, 'Message is required.'),
});

const contactFormStore = createStore(
  { status: 'idle' as Status, message: '', errors: {} as FormErrors },
  (set) => ({
    async submit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement;
      const result = validateWithSchema(emailSchema, extractFormData(form));

      if (result.ok) {
        set({ status: 'loading' });
        try {
          const res = await fetch('/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result.data),
          });
          const json = (await res.json()) as { ok: boolean; message: string };
          set({ message: json.message, status: json.ok ? 'success' : 'error' });
          if (json.ok) form.reset();
        } catch {
          set({ status: 'error', message: 'Network error. Please try again.' });
        }
        set({ errors: {} });

        setTimeout(() => {
          set({ status: 'idle', message: '' });
        }, 2 * 1000 /* 2 seconds */);
      } else {
        set({ errors: issuesToErrors(result.issues) });
      }
    },
  }),
);

export default ilha
  .state('data', ({ data }: PageInput) => data ?? null)
  .effect(({ state }) => {
    if (state.data()) return;
    (async () => {
      try {
        const result = await api.data.query();
        state.data(result);
      } catch {}
    })();
  })
  .on('form@submit', ({ event }) => {
    event.preventDefault();
    contactFormStore.getState().submit(event);
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return <div></div>;

    const loc = data[locale()];
    const { full_name, email, content } = loc.contact;
    const { errors, status, message } = contactFormStore.getState();

    return (
      <section class='section' id='contact'>
        <div class='container'>
          <div class='section-header'>
            <h2 class='section-title'>{loc.nav.contact}</h2>
          </div>
          <div class='glass-card contact-card'>
            <form class='contact-form'>
              <div class='form-group'>
                <label for='full_name'>Name</label>
                <input
                  type='text'
                  id='full_name'
                  name='full_name'
                  placeholder={full_name}
                />
                {errors.full_name && (
                  <span class='form-error'>{errors.full_name[0]}</span>
                )}
              </div>
              <div class='form-group'>
                <label for='email'>Email</label>
                <input
                  type='email'
                  id='email'
                  name='email'
                  placeholder={email}
                />
                {errors.email && (
                  <span class='form-error'>{errors.email[0]}</span>
                )}
              </div>
              <div class='form-group'>
                <label for='content'>Message</label>
                <textarea
                  id='content'
                  name='content'
                  placeholder={content}
                ></textarea>
                {errors.content && (
                  <span class='form-error'>{errors.content[0]}</span>
                )}
              </div>
              {status === 'error' && <p class='form-error'>{message}</p>}
              {status === 'success' && <p class='form-success'>{message}</p>}
              <button
                type='submit'
                class='btn btn-primary'
                disabled={status === 'loading'}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  });
