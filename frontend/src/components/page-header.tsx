import DotMatrix from './dot-matrix.tsx';
import { reveal } from '../lib/motion.ts';

type Props = {
  marker: string;
  eyebrow: string;
  title: string;
  description: string;
};

export default function PageHeader(props: Props) {
  return (
    <header class='relative isolate -mt-16 overflow-hidden border-b border-border pt-32 pb-16 sm:pt-36 sm:pb-20'>
      <DotMatrix mode='field' spacing={14} />
      <div class='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--background))_0%,hsl(var(--background)/0.94)_38%,hsl(var(--background)/0.55)_72%,hsl(var(--background)/0.2)_100%)]' />
      <div class='relative mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:items-end lg:px-10'>
        <div>
          <p
            class='truncate whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'
            data-scramble
            {...reveal}
          >
            {`${props.marker} / ${props.eyebrow}`}
          </p>
          <h1
            class='mt-4 whitespace-nowrap text-5xl font-bold tracking-[-0.055em] sm:text-6xl'
            data-reveal='lines'
            data-morph-preserve='data-revealed'
          >
            <span class='reveal-line'>
              <span>{props.title}</span>
            </span>
          </h1>
        </div>
        <p
          class='max-w-2xl text-lg leading-8 text-muted-foreground md:justify-self-end'
          {...reveal}
        >
          {props.description}
        </p>
      </div>
    </header>
  );
}
