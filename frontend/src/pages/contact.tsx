import { createStore } from '@ilha/store';
import { extractFormData } from '@ilha/store/form';
import { Button, Field, Input, Textarea } from 'areia';
import ilha from 'ilha';
import z from 'zod';
import type { Data } from '../bindings';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
};

const emailSchema = z.object({
  full_name: z.string().min(1, 'Name is required.'),
  email: z.email('Invalid email address.'),
  content: z.string().min(1, 'Message is required.'),
});

const contactFormStore = createStore(
  { status: 'idle' as 'idle' | 'loading' | 'success' | 'error', message: '' },
  (set) => ({
    async submit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement;
      set({ status: 'loading' });

      try {
        const res = await fetch('/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extractFormData(form)),
        });

        const json = (await res.json()) as {
          ok: boolean;
          message: string;
        };

        set({
          message: json.message,
          status: json.ok ? 'success' : 'error',
        });

        setTimeout(() => {
          set({ status: 'idle', message: '' });
          if (json.ok) form.reset();
        }, 1 * 1000);
      } catch {
        set({
          status: 'error',
          message: 'Network error. Please try again.',
        });
        setTimeout(() => {
          set({ status: 'idle', message: '' });
        }, 1 * 1000);
      }
    },
  }),
);

const StatusIsland = ilha.render(() => {
  const { status, message } = contactFormStore.getState();
  return (
    <>
      {status === 'error' && (
        <p class='text-[0.8125rem] text-[hsl(0_70%_50%)]'>{message}</p>
      )}
      {status === 'success' && (
        <p class='text-sm text-[hsl(142_60%_35%)]'>{message}</p>
      )}

      <Button
        class='px-16'
        variant='primary'
        shape='square'
        disabled={status === 'loading'}
        type='submit'
      >
        Send
      </Button>
    </>
  );
});

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
    event.stopPropagation();
    contactFormStore.getState().submit(event);
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return <div>Failed to fetch data from backend.</div>;

    const loc = data[locale()];
    const { full_name, email, content } = loc.contact;

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
              <Field
                label='Name'
                error='Enter your name.'
                validationMode='onSubmit'
                validate={(val) =>
                  emailSchema.shape.content.safeParse(val).success
                    ? null
                    : 'Enter your name.'
                }
              >
                <Input
                  name='full_name'
                  placeholder={full_name}
                  type='text'
                  required
                />
              </Field>

              <Field
                label='Email'
                error='Enter a valid email address.'
                validationMode='onSubmit'
                validate={(val) =>
                  emailSchema.shape.email.safeParse(val).success
                    ? null
                    : 'Enter a valid email address.'
                }
              >
                <Input name='email' placeholder={email} type='email' required />
              </Field>

              <Field
                label='Message'
                error='Enter a message to send.'
                validationMode='onSubmit'
                validate={(val) =>
                  emailSchema.shape.content.safeParse(val).success
                    ? null
                    : 'Enter a message to send.'
                }
              >
                <Textarea
                  name='content'
                  placeholder={content}
                  rows={4}
                  required
                />
              </Field>

              <StatusIsland />
            </form>
          </div>
        </div>
      </section>
    );
  });
