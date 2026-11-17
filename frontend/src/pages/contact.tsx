import { atom } from 'ilha';
import { ArrowRight, Check } from 'lucide';
import type { ApiResponse } from '../bindings/ApiResponse.ts';
import type { EmailPayload } from '../bindings/EmailPayload.ts';
import DotMatrix from '../components/dot-matrix.tsx';
import Icon from '../lib/icon.tsx';
import { useLocale } from '../lib/locale.ts';
import { revealStagger } from '../lib/motion.ts';
import { useServerData } from '../lib/server-data.ts';

const contactCopy = {
  en: {
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
    invalid: 'Check the fields and try again.',
  },
  no: {
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
    invalid: 'Sjekk feltene og prøv igjen.',
  },
} as const;

const inputClass =
  'peer h-11 w-full border-0 border-b border-border bg-transparent px-0 text-base text-foreground outline-none placeholder:text-muted-foreground/65 disabled:cursor-not-allowed disabled:opacity-50';
const underlineClass =
  'pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-300 ease-(--ease-out) peer-focus:scale-x-100';
const textareaClass =
  'peer block w-full resize-y border-0 border-b border-border px-0 text-base leading-8 text-foreground outline-none placeholder:text-muted-foreground/65 disabled:cursor-not-allowed disabled:opacity-50';

export default function Contact() {
  const data = useServerData(({ data }) => ({
    en: { nav: data.en.nav, contact: data.en.contact },
    no: { nav: data.no.nav, contact: data.no.contact },
  }));
  const locale = useLocale();
  const formState = atom<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.submitter) return;
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const payload: EmailPayload = {
      full_name: String(fields.get('full_name') ?? '').trim(),
      email: String(fields.get('email') ?? '').trim(),
      content: String(fields.get('content') ?? '').trim(),
    };
    if (!payload.full_name || !payload.email || payload.content.length < 10) {
      formState.set({
        status: 'error',
        message: contactCopy[locale()].invalid,
      });
      return;
    }

    formState.set({ status: 'loading', message: '' });

    try {
      const response = await fetch('/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as ApiResponse;
      formState.set({
        status: result.ok ? 'success' : 'error',
        message: result.message,
      });
      if (result.ok) form.reset();
    } catch {
      formState.set({
        status: 'error',
        message: 'Network error. Please try again.',
      });
    }
  };

  const localeCode = locale();
  const loc = data[localeCode];
  const copy = contactCopy[localeCode];
  const { status: statusValue, message: messageValue } = formState();
  const statusClass = statusValue === 'error'
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
    <section
      id='contact'
      class='hero-surface relative isolate -mt-16 flex min-h-svh flex-1 items-center overflow-hidden pt-26 pb-10 sm:pt-28 sm:pb-12'
      aria-labelledby='contact-title'
    >
      <div class='contact-landscape pointer-events-none absolute inset-0 -z-10' aria-hidden='true'>
        <DotMatrix mode='field' spacing={16} lens={170} fade={0} />
      </div>

      <div class='mx-auto grid w-full max-w-6xl items-start gap-10 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:px-10'>
        <div class='lg:pt-7'>
          <p class='mb-5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
            03 / {loc.nav.contact}
          </p>
          <h2 class='max-w-sm text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl'>
            {copy.when}
          </h2>
          <p class='mt-4 max-w-md text-base leading-7 text-muted-foreground'>
            {copy.intro}
          </p>

          <ul {...revealStagger} class='mt-7 space-y-4 border-y border-border py-6'>
            {copy.reasons.map((item) => (
              <li class='flex gap-3 text-sm leading-6 text-foreground'>
                <span class='mt-1 grid h-5 w-5 shrink-0 place-items-center border border-primary/35 bg-primary/10 text-primary'>
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

        <div class='contact-panel relative border border-border bg-card/95 px-6 py-7 sm:px-9 sm:py-9'>
          <div aria-hidden='true' class='mb-6 h-1 w-8 bg-primary' />
          <h1 id='contact-title' class='mb-3 text-4xl font-bold tracking-[-0.045em]'>
            {copy.write}
          </h1>

          <form
            class='flex flex-col gap-6'
            aria-describedby='contact-form-note'
            onsubmit={(event) => void submit(event)}
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
                    class='font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground'
                  >
                    {field.label}
                  </label>
                  <div class='relative'>
                    <input {...field} class={inputClass} required />
                    <span aria-hidden='true' class={underlineClass} />
                  </div>
                </div>
              ))}
            </div>

            <div class='flex flex-col gap-2'>
              <label
                for='contact-message'
                class='font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground'
              >
                {copy.message}
              </label>
              <div class='relative'>
                <textarea
                  id='contact-message'
                  name='content'
                  placeholder={content}
                  class={textareaClass}
                  rows={5}
                  minlength={10}
                  required
                />
                <span aria-hidden='true' class={underlineClass} />
              </div>
            </div>

            <div class='flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div aria-live='polite' class='min-h-6 text-sm'>
                {messageValue && <p class={statusClass}>{messageValue}</p>}
              </div>
              <button
                class='group inline-flex min-h-11 shrink-0 cursor-pointer select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-sm border-0 bg-primary px-6 py-2.5 text-base font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus:ring-ring/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
                disabled={statusValue === 'loading'}
                type='submit'
              >
                <span class='contents'>
                  {statusValue === 'loading' ? copy.sending : copy.send}
                </span>
                {statusValue === 'loading'
                  ? (
                    <span aria-hidden='true' class='inline-flex gap-1'>
                      <span class='size-1 bg-current motion-safe:animate-pulse' />
                      <span class='size-1 bg-current motion-safe:animate-pulse [animation-delay:150ms]' />
                      <span class='size-1 bg-current motion-safe:animate-pulse [animation-delay:300ms]' />
                    </span>
                  )
                  : (
                    <Icon
                      node={ArrowRight}
                      size={16}
                      class='transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-1 group-disabled:translate-x-0'
                    />
                  )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
