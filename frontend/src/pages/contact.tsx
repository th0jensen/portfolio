import { createStore } from '@ilha/store';
import { extractFormData } from '@ilha/store/form';
import { Button, Field, Input, Link, Textarea } from 'areia';
import ilha from 'ilha';
import { ArrowUpRight } from 'lucide';
import z from 'zod';
import type { Data } from '../bindings';
import Icon from '../lib/icon';
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
        const response = await fetch('/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extractFormData(form)),
        });
        const result = (await response.json()) as {
          ok: boolean;
          message: string;
        };

        set({
          message: result.message,
          status: result.ok ? 'success' : 'error',
        });
        if (result.ok) form.reset();
      } catch {
        set({
          status: 'error',
          message: 'Network error. Please try again.',
        });
      }
    },
  }),
);

const StatusIsland = ilha.render(() => {
  const { status, message } = contactFormStore.getState();
  const isNorwegian = locale() === 'no';

  return (
    <div class='flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <div aria-live='polite' class='min-h-6 text-sm'>
        {status === 'error' && <p class='text-[hsl(2_62%_54%)]'>{message}</p>}
        {status === 'success' && (
          <p class='text-[hsl(142_55%_40%)]'>{message}</p>
        )}
      </div>
      <Button
        class='min-h-11 min-w-36 rounded-sm px-7 font-bold'
        variant='primary'
        shape='square'
        disabled={status === 'loading'}
        type='submit'
      >
        {status === 'loading'
          ? isNorwegian
            ? 'Sender…'
            : 'Sending…'
          : isNorwegian
            ? 'Send melding'
            : 'Send message'}
      </Button>
    </div>
  );
});

export default ilha
  .state('data', ({ data }: PageInput) => data ?? null)
  .effect(({ state }) => {
    if (state.data()) return;
    (async () => {
      try {
        state.data(await api.data.query());
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
    if (!data) return '';

    const loc = data[locale()];
    const isNorwegian = locale() === 'no';
    const { full_name, email, content } = loc.contact;
    const labels = isNorwegian
      ? {
          name: 'Navn',
          email: 'E-post',
          message: 'Melding',
          nameError: 'Skriv inn navnet ditt.',
          emailError: 'Skriv inn en gyldig e-postadresse.',
          messageError: 'Skriv inn en melding.',
        }
      : {
          name: 'Name',
          email: 'Email',
          message: 'Message',
          nameError: 'Enter your name.',
          emailError: 'Enter a valid email address.',
          messageError: 'Enter a message.',
        };

    return (
      <section id='contact' class='flex-1'>
        <header class='relative overflow-hidden border-b border-border py-16 sm:py-20'>
          <div class='technical-grid absolute inset-0 opacity-35' />
          <div class='absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--background)/0.98),hsl(var(--background)/0.78))]' />
          <div class='relative mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:items-end lg:px-10'>
            <div>
              <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
                03 / {loc.nav.contact}
              </p>
              <h1 class='mt-4 text-5xl font-bold tracking-[-0.055em] sm:text-6xl'>
                {loc.nav.contact}
              </h1>
            </div>
            <p class='max-w-2xl text-lg leading-8 text-muted-foreground md:justify-self-end'>
              {isNorwegian
                ? 'Send meg en melding om et prosjekt, et teknisk problem eller noe du mener vi bør snakke om.'
                : 'Send a note about a project, a technical problem, or anything you think is worth discussing.'}
            </p>
          </div>
        </header>

        <div class='mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:gap-0 lg:px-10'>
          <aside class='lg:border-r lg:border-border lg:pr-14'>
            <p class='font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground'>
              {isNorwegian ? 'Andre kanaler' : 'Other channels'}
            </p>
            <div class='mt-6 divide-y divide-border border-y border-border'>
              <Link
                href={loc.buttons.github.url}
                class='group flex items-center justify-between py-5 text-foreground no-underline hover:text-primary'
                external
              >
                <span class='font-bold'>{loc.buttons.github.label}</span>
                <Icon
                  node={ArrowUpRight}
                  size={17}
                  attrs='class="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"'
                />
              </Link>
              <Link
                href={loc.buttons.linkedin.url}
                class='group flex items-center justify-between py-5 text-foreground no-underline hover:text-primary'
                external
              >
                <span class='font-bold'>{loc.buttons.linkedin.label}</span>
                <Icon
                  node={ArrowUpRight}
                  size={17}
                  attrs='class="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"'
                />
              </Link>
              <Link
                href='/static/resume.pdf'
                class='group flex items-center justify-between py-5 text-foreground no-underline hover:text-primary'
                external
              >
                <span class='font-bold'>{loc.buttons.resume}</span>
                <Icon
                  node={ArrowUpRight}
                  size={17}
                  attrs='class="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"'
                />
              </Link>
            </div>
            <p class='mt-7 max-w-sm text-sm leading-6 text-muted-foreground'>
              {isNorwegian
                ? 'Skjemaet sender meldingen direkte og deler ikke kontaktinformasjonen din offentlig.'
                : 'This form sends your message directly and does not expose your contact details publicly.'}
            </p>
          </aside>

          <div class='contact-panel lg:pl-14'>
            <div class='mb-8 flex items-center justify-between border-b border-border pb-4'>
              <h2 class='text-2xl font-bold tracking-[-0.03em]'>
                {isNorwegian ? 'Skriv en melding' : 'Write a message'}
              </h2>
              <span class='font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                01—03
              </span>
            </div>

            <form class='flex flex-col gap-6' novalidate>
              <div class='grid gap-6 sm:grid-cols-2'>
                <Field
                  label={labels.name}
                  error={labels.nameError}
                  validationMode='onSubmit'
                  validate={(value) =>
                    emailSchema.shape.full_name.safeParse(value).success
                      ? null
                      : labels.nameError
                  }
                >
                  <Input
                    name='full_name'
                    placeholder={full_name}
                    type='text'
                    autocomplete='name'
                    required
                  />
                </Field>

                <Field
                  label={labels.email}
                  error={labels.emailError}
                  validationMode='onSubmit'
                  validate={(value) =>
                    emailSchema.shape.email.safeParse(value).success
                      ? null
                      : labels.emailError
                  }
                >
                  <Input
                    name='email'
                    placeholder={email}
                    type='email'
                    autocomplete='email'
                    required
                  />
                </Field>
              </div>

              <Field
                label={labels.message}
                error={labels.messageError}
                validationMode='onSubmit'
                validate={(value) =>
                  emailSchema.shape.content.safeParse(value).success
                    ? null
                    : labels.messageError
                }
              >
                <Textarea
                  name='content'
                  placeholder={content}
                  rows={7}
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
