import { cn } from '../lib/cn.ts';
import type { JSX } from 'ilha/jsx-runtime';

type Props = JSX.IntrinsicElements['a'] & {
  href: string;
  external?: boolean;
};

export function Link({ external, ...props }: Props) {
  if (external) {
    Object.assign(props, { target: '_blank', rel: 'noopener noreferrer' });
  }
  return <a {...props} />;
}

export function LinkButton(
  { variant = 'primary', class: className, ...props }: Props & {
    variant?: 'primary' | 'ghost';
    class?: string;
  },
) {
  return (
    <Link
      {...props}
      class={cn(
        'inline-flex cursor-pointer select-none items-center justify-center gap-1.5 no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-transparent text-foreground hover:bg-muted',
        className,
      )}
    />
  );
}
