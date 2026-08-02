import ilha, { batch } from 'ilha';
import { Check, CircleDot } from 'lucide';
import type { Data } from '../bindings/index.ts';
import PageHeader from '../components/page-header.tsx';
import Icon from '../lib/icon.tsx';
import { locale } from '../lib/locale.ts';
import api from '../lib/rpc.ts';

type PageInput = {
  data: {
    en: Pick<Data['en'], 'nav' | 'contact'>;
    no: Pick<Data['no'], 'nav' | 'contact'>;
  };
};

const contactCopy = {
  en: {
    description: 'Open to systems engineering roles.',
    availability: 'Open for roles',
    when: 'Good reasons to write',
    intro: 'Reach out about a role, a focused project, or open-source work.',
    reasons: [
      'Full-time systems engineering roles',
      'Rust, backend, or native software',
      'Focused open-source collaboration',
    ],
    exclude: 'Not the right place for sales pitches or third-party support.',
    write: 'Send a note',
    note: 'Add a little context and the next step you have in mind. All fields are required.',
    name: 'Name',
    email: 'Email',
    message: 'Message',
    sending: 'Sending…',
    send: 'Send message',
  },
  no: {
    description: 'Åpen for roller innen systemutvikling.',
    availability: 'Åpen for roller',
    when: 'Gode grunner til å skrive',
    intro: 'Ta kontakt om en rolle, et tydelig prosjekt eller åpen kildekode.',
    reasons: [
      'Faste roller innen systemutvikling',
      'Rust, backend eller native programvare',
      'Fokusert samarbeid om åpen kildekode',
    ],
    exclude: 'Ikke ment for salgshenvendelser eller support på tredjepartsprodukter.',
    write: 'Send en melding',
    note: 'Legg ved litt kontekst og ønsket neste steg. Alle felter er påkrevd.',
    name: 'Navn',
    email: 'E-post',
    message: 'Melding',
    sending: 'Sender…',
    send: 'Send melding',
  },
} as const;

const inputClass =
  'h-9 gap-1.5 rounded-lg border-0 bg-areia-control-background px-3 text-base text-areia-default ring ring-areia-divider outline-none placeholder:text-areia-placeholder focus:ring-[1.5px] focus:ring-areia-ring/50 focus:outline-none disabled:cursor-not-allowed disabled:text-areia-disabled disabled:opacity-50';
const textareaClass =
  'w-full resize-vertical rounded-lg border-0 bg-areia-control-background px-3 py-2 text-base text-areia-default ring ring-areia-divider outline-none placeholder:text-areia-placeholder focus:ring-[1.5px] focus:ring-areia-ring/50 focus:outline-none disabled:cursor-not-allowed disabled:text-areia-disabled disabled:opacity-50';

export default ilha
  .input<PageInput>()
  .state('data', ({ data }) => data)
  .state('status', 'idle' as 'idle' | 'loading' | 'success' | 'error')
  .state('message', '')
  .on('form@submit:abortable', async ({ event, state }) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.submitter) return;
    const form = event.target as HTMLFormElement;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const payload = {
      full_name: String(fields.get('full_name') ?? ''),
      email: String(fields.get('email') ?? ''),
      content: String(fields.get('content') ?? ''),
    };

    batch(() => {
      state.status('loading');
      state.message('');
    });

    try {
      const result = await api.dispatch_email.mutate(payload);
      batch(() => {
        state.message(result.message);
        state.status(result.ok ? 'success' : 'error');
      });
      if (result.ok) form.reset();
    } catch {
      batch(() => {
        state.status('error');
        state.message('Network error. Please try again.');
      });
    }
  })
  .render(({ state }) => {
    const data = state.data();
    const loc = data[locale()];
    const copy = contactCopy[locale()];
    const status = state.status();
    const message = state.message();
    const statusClass = status === 'error'
      ? 'text-[hsl(2_72%_42%)] dark:text-[hsl(2_78%_72%)]'
      : 'text-[hsl(142_68%_28%)] dark:text-[hsl(142_52%_68%)]';
    const { full_name, email, content } = loc.contact;
    const fields = [
      {
        id: 'contact-name',
        name: 'full_name',
        label: copy.name,
        placeholder: full_name,
        type: 'text',
        autocomplete: 'name',
      },
      {
        id: 'contact-email',
        name: 'email',
        label: copy.email,
        placeholder: email,
        type: 'email',
        autocomplete: 'email',
      },
    ] as const;

    return (
      <section id='contact' class='flex-1'>
        <PageHeader
          marker='03'
          eyebrow={loc.nav.contact}
          title={loc.nav.contact}
          description={copy.description}
        />

        <div class='mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-0 lg:px-10'>
          <div class='lg:border-r lg:border-border lg:pr-14'>
            <div class='inline-flex items-center gap-2 whitespace-nowrap border border-border bg-card px-3 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-foreground'>
              <Icon node={CircleDot} size={14} />
              {copy.availability}
            </div>

            <h2 class='mt-8 text-2xl font-bold tracking-[-0.03em]'>
              {copy.when}
            </h2>
            <p class='mt-4 max-w-md text-base leading-7 text-muted-foreground'>
              {copy.intro}
            </p>

            <ul class='mt-6 space-y-4 border-y border-border py-6'>
              {copy.reasons.map((item) => (
                <li class='flex gap-3 text-sm leading-6 text-foreground'>
                  <span class='mt-1 grid h-5 w-5 shrink-0 place-items-center bg-primary text-primary-foreground'>
                    <Icon node={Check} size={12} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p class='mt-6 max-w-md text-sm leading-6 text-muted-foreground'>
              {copy.exclude}
            </p>
          </div>

          <div class='contact-panel lg:pl-14'>
            <div class='mb-8 flex items-center justify-between border-b border-border pb-4'>
              <h2 class='text-2xl font-bold tracking-[-0.03em]'>
                {copy.write}
              </h2>
              <span class='font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
                01—03
              </span>
            </div>

            <form
              class='flex flex-col gap-6'
              aria-describedby='contact-form-note'
            >
              <p
                id='contact-form-note'
                class='text-sm leading-6 text-muted-foreground'
              >
                {copy.note}
              </p>

              <div class='grid gap-6 sm:grid-cols-2'>
                {fields.map((field) => (
                  <div class='flex flex-col gap-2'>
                    <label
                      for={field.id}
                      class='text-sm font-medium text-foreground'
                    >
                      {field.label}
                    </label>
                    <input
                      {...field}
                      class={inputClass}
                      required
                    />
                  </div>
                ))}
              </div>

              <div class='flex flex-col gap-2'>
                <label
                  for='contact-message'
                  class='text-sm font-medium text-foreground'
                >
                  {copy.message}
                </label>
                <textarea
                  id='contact-message'
                  name='content'
                  placeholder={content}
                  class={textareaClass}
                  rows={7}
                  minlength={10}
                  required
                />
              </div>

              <div class='flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div aria-live='polite' class='min-h-6 text-sm'>
                  {message && <p class={statusClass}>{message}</p>}
                </div>
                <button
                  class='group flex size-9 min-h-11 min-w-36 shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 rounded-sm border-0 bg-areia-primary p-0 px-7 text-base font-bold text-areia-primary-foreground! shadow-xs hover:bg-areia-primary/90 focus:ring-areia-ring/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-areia-ring disabled:cursor-not-allowed disabled:bg-areia-primary/50 disabled:text-areia-disabled'
                  disabled={status === 'loading'}
                  type='submit'
                >
                  <span class='contents'>
                    {status === 'loading' ? copy.sending : copy.send}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    );
  });
