import { LinkButton } from 'areia';
import ilha from 'ilha';
import { ArrowLeft } from 'lucide';
import Icon from '../lib/icon';

export default ilha.render(() => (
  <section
    id='error'
    class='technical-grid relative flex min-h-[calc(100vh-4rem)] flex-1 items-center overflow-hidden'
  >
    <div class='absolute inset-0 bg-background/80' />
    <div class='relative mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10'>
      <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
        Error / 404
      </p>
      <h1 class='mt-5 max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.055em] sm:text-7xl'>
        This route doesn’t exist.
      </h1>
      <p class='mt-6 max-w-xl text-lg leading-8 text-muted-foreground'>
        The page may have moved, or the address may be incorrect. Return to the
        portfolio index to continue.
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
  </section>
));
