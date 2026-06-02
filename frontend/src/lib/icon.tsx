import type { IconNode } from 'lucide';

function parseAttrs(attrs: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const match of attrs.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    result[match[1]] = match[2];
  }

  return result;
}

export default function Icon({
  node,
  size = 24,
  attrs = '',
}: {
  node: IconNode;
  size?: number;
  attrs?: string;
}) {
  const svgAttrs = parseAttrs(attrs);

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      aria-label='icon'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      stroke-width='2'
      stroke-linecap='round'
      stroke-linejoin='round'
      {...svgAttrs}
    >
      {node.map(([tag, props]) => {
        const Tag = tag;
        return <Tag {...props} />;
      })}
    </svg>
  );
}
