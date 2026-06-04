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

          const json = (await res.json()) as {
            ok: boolean;
            message: string;
          };

          set({
            message: json.message,
            status: json.ok ? 'success' : 'error',
          });

          if (json.ok) form.reset();
        } catch {
          set({
            status: 'error',
            message: 'Network error. Please try again.',
          });
        }

        set({ errors: {} });

        setTimeout(() => {
          set({ status: 'idle', message: '' });
        }, 2 * 1000);
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
      <section class='py-20' id='contact'>
        <div class='mx-auto w-full max-w-6xl px-6'>
          <div class='mb-12'>
            <h2 class='text-[1.875rem] font-bold tracking-[-0.02em]'>
              {loc.nav.contact}
            </h2>
          </div>

          <div class='flex flex-col gap-6 rounded-2xl border border-border/50 bg-card/80 p-8 backdrop-blur-2xl md:p-10'>
            <form class='flex flex-col gap-5'>
              <div class='flex flex-col gap-1.5'>
                <label
                  for='full_name'
                  class='text-sm font-medium text-foreground'
                >
                  Name
                </label>

                <input
                  type='text'
                  id='full_name'
                  name='full_name'
                  placeholder={full_name}
                  class='w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-[0.9375rem] text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-ring focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.2)]'
                />

                {errors.full_name && (
                  <span class='text-[0.8125rem] text-[hsl(0_70%_50%)]'>
                    {errors.full_name[0]}
                  </span>
                )}
              </div>

              <div class='flex flex-col gap-1.5'>
                <label for='email' class='text-sm font-medium text-foreground'>
                  Email
                </label>

                <input
                  type='email'
                  id='email'
                  name='email'
                  placeholder={email}
                  class='w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-[0.9375rem] text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-ring focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.2)]'
                />

                {errors.email && (
                  <span class='text-[0.8125rem] text-[hsl(0_70%_50%)]'>
                    {errors.email[0]}
                  </span>
                )}
              </div>

              <div class='flex flex-col gap-1.5'>
                <label
                  for='content'
                  class='text-sm font-medium text-foreground'
                >
                  Message
                </label>

                <textarea
                  id='content'
                  name='content'
                  placeholder={content}
                  class='min-h-32 w-full resize-y rounded-xl border border-border bg-muted px-3.5 py-2.5 text-[0.9375rem] text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-ring focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.2)]'
                ></textarea>

                {errors.content && (
                  <span class='text-[0.8125rem] text-[hsl(0_70%_50%)]'>
                    {errors.content[0]}
                  </span>
                )}
              </div>

              {status === 'error' && (
                <p class='text-[0.8125rem] text-[hsl(0_70%_50%)]'>{message}</p>
              )}

              {status === 'success' && (
                <p class='text-sm text-[hsl(142_60%_35%)]'>{message}</p>
              )}

              <button
                type='submit'
                disabled={status === 'loading'}
                class='inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-primary px-5 text-[0.9375rem] font-semibold whitespace-nowrap text-primary-foreground transition-all duration-200 ease-in-out hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2'
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  });
