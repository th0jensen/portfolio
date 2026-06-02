import ilha from 'ilha';
import type { Data, NowPlayingTrack } from '../bindings';
import type { Hero } from '../bindings/Hero';
import type { SocialButton } from '../bindings/SocialButton';
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

const Button = ({
  item,
  styles = '',
}: {
  item: SocialButton;
  styles?: string;
}) => (
  <a
    href={item.url}
    target='_blank'
    rel='noopener noreferrer'
    class='btn btn-secondary'
    style={styles}
  >
    {item.label}
  </a>
);

const NowPlaying = ({
  track,
  hero,
}: {
  track: NowPlayingTrack | null;
  hero: Hero;
}) => {
  if (track === null) return <div></div>;
  return (
    <>
      {hero.now_playing}:{' '}
      <a href={track.url} target='_blank' rel='noopener noreferrer'>
        {track.name} {hero.by} {track.artist}
      </a>
    </>
  );
};

const RenderCurrentlyBuilding = ({
  text,
  url,
}: {
  text: string;
  url: string;
}) => {
  const name = 'Crabdash';
  const idx = text.indexOf(name);
  if (idx === -1) {
    return (
      <>
        {text}{' '}
        <a href={url} target='_blank' rel='noopener noreferrer'>
          {name}
        </a>
      </>
    );
  }

  return (
    <>
      {text.slice(0, idx)}
      <a href={url} target='_blank' rel='noopener noreferrer'>
        {name}
      </a>
      {text.slice(idx + name.length)}
    </>
  );
};

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

    const headshot = (mobile = false) => (
      <div class={mobile ? 'hero-mobile-image' : 'hero-portrait'}>
        <img
          src='/static/headshot.jpg'
          alt={`Headshot of ${data.about.first_name}`}
          fetchpriority='high'
          width={mobile ? 1200 : 360}
          height={mobile ? 1391 : 418}
        />
      </div>
    );

    return (
      <section class='hero-section' id='hero'>
        <div class='hero-bg-gradient'></div>
        <div class='hero-bg-blob-1'></div>
        <div class='hero-bg-blob-2'></div>

        {headshot(true)}

        <div class='hero-mobile-fade'></div>

        <div class='container hero-inner'>
          <div class='hero-grid'>
            <div class='hero-content'>
              <p class='hero-eyebrow'>{loc.hero.role}</p>
              <h1 class='hero-name'>{name}</h1>
              <p class='hero-description'>{description}</p>

              <div class='hero-actions hero-actions--desktop'>
                <a
                  href='/projects'
                  class='btn btn-primary btn-lg'
                  style='min-width:12rem'
                >
                  {loc.hero.explore_work}
                </a>
                <Button item={loc.buttons.github} styles='min-width:10rem' />
                <Button item={loc.buttons.linkedin} styles='min-width:10rem' />
              </div>

              <div class='hero-actions hero-actions--mobile'>
                <a href='/projects' class='btn btn-primary btn-lg'>
                  {loc.hero.explore_work}
                </a>
                <div class='social-row'>
                  <Button item={loc.buttons.github} />
                  <Button item={loc.buttons.linkedin} />
                </div>
              </div>

              <p class='hero-currently'>
                <span>
                  <RenderCurrentlyBuilding
                    text={loc.hero.currently_building}
                    url={data.projects[1].source_link}
                  />
                </span>
                <span>
                  <NowPlaying track={state.nowPlaying()} hero={loc.hero} />
                </span>
              </p>
            </div>

            {headshot()}
          </div>
        </div>
      </section>
    );
  });
