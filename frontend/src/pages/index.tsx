import { Icon, LinkButton } from 'areia';
import ilha from 'ilha';
import { ExternalLink } from 'lucide';
import type { Data, NowPlayingTrack } from '../bindings';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
};

function calculateAge(birthday: string): number {
  const [month, day, year] = birthday.split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// const Button = ({ item, styles }: { item: SocialButton; styles?: string }) => (
//   <a
//     href={item.url}
//     target='_blank'
//     rel='noopener noreferrer'
//     class='inline-flex items-center justify-center font-semibold text-[0.9375rem] rounded-[--radius] cursor-pointer transition-all duration-200 ease-in-out border-none no-underline whitespace-nowrap h-11 px-5 font-inherit focus-visible:outline focus-visible:outline-[hsl(var(--ring))] focus-visible:outline-offset-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/0.7)]'
//     style={styles}
//   >
//     {item.label}
//   </a>
// );

// const NowPlaying = ({
//   track,
//   hero,
// }: {
//   track: NowPlayingTrack | null;
//   hero: Hero;
// }) => {
//   if (track === null) return <div></div>;
//   return (
//     <>
//       {hero.now_playing}:
//       <a href={track.url} target='_blank' rel='noopener noreferrer'>
//         {track.name} {hero.by} {track.artist}
//       </a>
//     </>
//   );
// };

export default ilha
  .state('data', ({ data }: PageInput) => data ?? null)
  .state('nowPlaying', null as NowPlayingTrack | null)
  .effect(({ state }) => {
    if (!state.data()) {
      (async () => {
        try {
          const result = await api.data.query();
          state.data(result);
        } catch {}
      })();
    }
    (async () => {
      try {
        const result = await api.lastfm.query();
        state.nowPlaying(result);
      } catch {}
    })();
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return <div></div>;

    const loc = data[locale()];
    const age = calculateAge(data.about.birthday);
    const description = loc.hero.description.replace('{age}', String(age));
    const name = `${data.about.first_name} ${data.about.last_name}`;
    const fp = data.projects[1];
    const idx = loc.hero.currently_building.indexOf(data.projects[1].name);
    const track = state.nowPlaying();

    const Headshot = ({ mobile = false }: { mobile?: boolean }) => (
      <div
        class={
          mobile
            ? 'absolute top-0 left-0 right-0 h-[62vh] overflow-hidden z-0 md:hidden'
            : 'hidden md:flex justify-center items-center'
        }
      >
        <img
          src='/static/headshot.jpg'
          alt={`Headshot of ${data.about.first_name}`}
          fetchpriority='high'
          height={mobile ? '1391' : '418'}
          width={mobile ? '1200' : '360'}
          class={
            mobile
              ? 'w-full h-full object-cover object-[50%_35%]'
              : 'w-auto h-auto max-h-[calc(100vh-9rem)] rounded-[--radius]'
          }
        />
      </div>
    );

    return (
      <section
        class='relative min-h-[calc(100vh-9.5rem)] overflow-x-hidden max-md:-mt-16 max-md:min-h-[calc(100vh-6rem)]'
        id='hero'
      >
        {/* Background */}
        <div class='absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--background))_60%,hsl(var(--accent)/0.06)_100%)] pointer-events-none'></div>
        <div class='absolute left-[5%] top-[20%] w-[24rem] h-96 rounded-full bg-[hsl(var(--primary)/0.08)] blur-3xl pointer-events-none'></div>
        <div class='absolute right-[10%] bottom-[20%] w-[20rem] h-80 rounded-full bg-[hsl(var(--accent)/0.1)] blur-3xl pointer-events-none'></div>

        {/* Mobile image */}
        <Headshot mobile={true} />
        <div class='pointer-events-none absolute top-30 left-0 right-0 h-[calc(62vh-6.25rem)] bg-[linear-gradient(to_bottom,transparent_0,transparent_calc(35%+50px),hsl(var(--background))_75%,hsl(var(--background))_100%)] z-10 md:hidden'></div>

        {/* Content */}
        <div class='w-full max-w-6xl mx-auto px-6 -mt-8 relative z-20 min-h-[calc(100vh-9.5rem)] flex flex-col justify-center'>
          <div class='grid grid-cols-1 gap-8 items-start pt-[calc(26vh+4rem)] md:grid-cols-[3fr_2fr] md:gap-16 md:items-center md:pt-6'>
            <div class='relative'>
              <p class='text-xs font-semibold tracking-widest uppercase text-[hsl(var(--muted-foreground))] mb-2'>
                {loc.hero.role}
              </p>
              <h1 class='text-[2.5rem] lg:text-[3.75rem] font-bold tracking-tight bg-[linear-gradient(to_right,hsl(var(--foreground))_0%,hsl(var(--foreground)/0.7)_100%)] bg-clip-text text-transparent leading-[1.2]! pb-1.5 mb-0'>
                {name}
              </h1>
              <p class='max-w-2xl text-base lg:text-lg leading-relaxed text-[hsl(var(--foreground)/0.85)] mt-4 mb-3 dark:text-[hsl(var(--muted-foreground))]'>
                {description}
              </p>

              {/* Desktop actions */}
              <div class='hidden md:flex flex-wrap gap-3 pt-1.5 items-center'>
                <LinkButton
                  class='font-bold'
                  href={'/projects'}
                  variant='primary'
                >
                  {loc.hero.explore_work}
                </LinkButton>
                <LinkButton
                  class='min-w-24 justify-center font-bold'
                  href={loc.buttons.github.url}
                  variant='ghost'
                  external
                >
                  {loc.buttons.github.label}
                </LinkButton>
                <LinkButton
                  class='min-w-24 justify-center font-bold'
                  href={loc.buttons.linkedin.url}
                  variant='ghost'
                  external
                >
                  {loc.buttons.linkedin.label}
                </LinkButton>
              </div>

              {/* Mobile actions */}
              <div class='inline-flex flex-col items-stretch md:hidden flex-wrap gap-3 pt-1.5'>
                <LinkButton
                  class='font-bold'
                  href={'/projects'}
                  variant='primary'
                >
                  {loc.hero.explore_work}
                </LinkButton>
                <div class='inline-flex flex-row items-stretch flex-wrap'>
                  <LinkButton
                    class='font-bold'
                    href={loc.buttons.github.url}
                    variant='ghost'
                    external
                  >
                    {loc.buttons.github.label}
                  </LinkButton>
                  <LinkButton
                    class='font-bold'
                    href={loc.buttons.linkedin.url}
                    variant='ghost'
                    external
                  >
                    {loc.buttons.linkedin.label}
                  </LinkButton>
                </div>
              </div>

              <p class='mt-4'>
                <span class='flex flex-row items-center'>
                  {loc.hero.currently_building.slice(0, idx)}{' '}
                  <LinkButton
                    href={fp.source_link}
                    variant='ghost'
                    icon={<Icon icon={ExternalLink} />}
                    external
                  >
                    {loc.hero.currently_building.slice(
                      idx,
                      idx + fp.name.length,
                    )}
                  </LinkButton>
                </span>
                <span>
                  {state.nowPlaying() !== null && (
                    <>
                      {loc.hero.now_playing}:{' '}
                      <a
                        href={track?.url}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {track?.name} {loc.hero.by} {track?.artist}
                      </a>
                    </>
                  )}
                </span>
              </p>
            </div>

            {/* Portrait */}
            <Headshot />
          </div>
        </div>
      </section>
    );
  });
