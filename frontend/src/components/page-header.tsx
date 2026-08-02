type Props = {
  marker: string;
  eyebrow: string;
  title: string;
  description: string;
};

export default function PageHeader(props: Props) {
  return (
    <header class='relative overflow-hidden border-b border-border py-16 sm:py-20'>
      <div class='technical-grid absolute inset-0 opacity-35' />
      <div class='absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--background)/0.98),hsl(var(--background)/0.78))]' />
      <div class='relative mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:items-end lg:px-10'>
        <div>
          <p class='truncate whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
            {props.marker} / {props.eyebrow}
          </p>
          <h1 class='mt-4 whitespace-nowrap text-5xl font-bold tracking-[-0.055em] sm:text-6xl'>
            {props.title}
          </h1>
        </div>
        <p class='max-w-2xl text-lg leading-8 text-muted-foreground md:justify-self-end'>
          {props.description}
        </p>
      </div>
    </header>
  );
}
