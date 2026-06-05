import { LinkButton } from 'areia';
import ilha from 'ilha';

export default ilha.render(() => {
  return (
    <section
      id='error'
      class='flex flex-col min-h-[calc(100vh-9.5rem)] justify-center items-center gap-5'
    >
      <div class='flex flex-col items-center gap-2'>
        <h1 class='font-bold text-2xl'>Error 404: Page Not Found</h1>
        <p class='text-sm italic'>
          The page you're looking for doesn't exist or something went wrong.
        </p>
      </div>
      <LinkButton href='/' variant='primary'>
        Go Home
      </LinkButton>
    </section>
  );
});
