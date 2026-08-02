type Props = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function SectionHeader(props: Props) {
  return (
    <div class='mb-12 grid gap-6 border-b border-border pb-8 md:grid-cols-[0.8fr_1.2fr] md:items-end'>
      <div>
        <p class='font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-primary'>
          {props.eyebrow}
        </p>
        <h2 class='mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl'>
          {props.title}
        </h2>
      </div>
      <p class='max-w-xl text-base leading-7 text-muted-foreground md:justify-self-end'>
        {props.description}
      </p>
    </div>
  );
}
