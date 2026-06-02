import ilha from 'ilha';
import { GitFork } from 'lucide';
import type { Data, ExperienceItem } from '../bindings';
import Icon from '../lib/icon';
import { locale } from '../lib/locale';
import api from '../lib/rpc';

type PageInput = {
  data?: Data;
  experience?: ExperienceItem[];
};

function formatCompact(n: bigint | number): string {
  const v = typeof n === 'bigint' ? Number(n) : n;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toString();
}

function prBadge(state: string | null | undefined) {
  if (!state) return <div></div>;
  const label = state.charAt(0).toUpperCase() + state.slice(1);
  return <span class={`pr-badge pr-badge--${state}`}>{label}</span>;
}

const ExperienceCard = ({ item }: { item: ExperienceItem }) => (
  <>
    <div class='glass-card repo-card smooth-transition'>
      <a
        href={item.url}
        class='repo-card__name'
        target='_blank'
        rel='noopener noreferrer'
      >
        {item.name}{' '}
        {item.pr_number ? (
          <span class='repo-card__pr-number'>#{item.pr_number}</span>
        ) : (
          <div></div>
        )}
      </a>
      <p class='repo-card__desc'>{item.description}</p>
      <div class='repo-card__stats'>
        <span
          class='repo-card__lang-dot'
          style={`background:${item.language_color}`}
        ></span>
        <span>{item.language}</span>
        <span class='repo-card__stars'>★ {formatCompact(item.stars)}</span>
        {item.forks ? (
          <span class='repo-card__stars'>
            {
              <Icon
                node={GitFork}
                size={13}
                attrs='class="repo-card__stat-icon" aria-hidden="true"'
              />
            }
            {formatCompact(item.forks)}
          </span>
        ) : (
          <div></div>
        )}
        {item.downloads != null && item.type === 'zed-extension' ? (
          <span class='repo-card__downloads'>
            ↓ {formatCompact(item.downloads)}
          </span>
        ) : (
          <div></div>
        )}
        {item.additions != null ? (
          <span
            class='repo-card__pr-info'
            style='display:inline-flex;align-items:center;gap:0.75rem;margin-left:auto'
          >
            <span style='display:inline-flex;align-items:center;gap:0.25rem'>
              <span class='pr-additions'>+{item.additions}</span>
              <span class='pr-deletions'>−{item.deletions}</span>
            </span>
            {prBadge(item.pr_state)}
          </span>
        ) : (
          <span style='margin-left:auto'>{prBadge(item.pr_state)}</span>
        )}
      </div>
    </div>
  </>
);

export default ilha
  .state('data', ({ data }: PageInput) => data ?? null)
  .state('experience', ({ experience }: PageInput) => experience ?? [])
  .effect(({ state }) => {
    if (!state.data()) {
      (async () => {
        try {
          const result = await api.data.query();
          state.data(result);
        } catch {}
      })();
    }
    if (state.experience().length === 0) {
      (async () => {
        try {
          const result = await api.experience.query();
          state.experience(result);
        } catch {}
      })();
    }
  })
  .render(({ state }) => {
    const data = state.data();
    if (!data) return <div></div>;

    const loc = data[locale()];
    const items = state.experience();
    const cards = items.map((item) => <ExperienceCard item={item} />);

    return (
      <section class='section' id='experience'>
        <div class='container'>
          <div class='section-header'>
            <p class='section-eyebrow'>{loc.experience.subtitle}</p>
            <h2 class='section-title section-title--lg'>
              {loc.nav.experience}
            </h2>
            <p class='section-desc'>{loc.experience.description}</p>
          </div>
          <div class='repo-grid'>{cards}</div>
        </div>
      </section>
    );
  });
