import { LinkButton } from '../components/link.tsx';
import { ArrowLeft } from 'lucide';
import DotMatrix from '../components/dot-matrix.tsx';
import Icon from '../lib/icon.tsx';

export default function ErrorPage() {
  return (
    <section
      id='error'
      class='relative flex min-h-[calc(100vh-4rem)] flex-1 items-center overflow-hidden'
    >
      <DotMatrix mode='field' />
      <div class='absolute inset-0 bg-background/80' />
      <div class='relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:px-10'>
        <div class='relative order-first h-48 sm:h-64 lg:order-last'>
          <DotMatrix mode='text' text='404' spacing={8} />
        </div>
        <div>
          <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
            Error / 404
          </p>
          <h1 class='mt-5 max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.055em] sm:text-7xl'>
            This route doesn’t exist.
          </h1>
          <p class='mt-6 max-w-xl text-lg leading-8 text-muted-foreground'>
            The page may have moved, or the address may be incorrect. Return to the portfolio index
            to continue.
          </p>
          <LinkButton
            href='/'
            variant='primary'
            class='mt-9 min-h-11 rounded-sm px-5 font-bold'
          >
            <Icon node={ArrowLeft} size={16} />
            Go home
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
