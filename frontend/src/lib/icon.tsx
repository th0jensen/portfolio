import type { IconNode } from 'lucide';

export default function Icon({
  node,
  size = 24,
  class: className,
}: {
  node: IconNode;
  size?: number;
  class?: string;
}) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      aria-hidden='true'
      focusable='false'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      stroke-width='2'
      stroke-linecap='round'
      stroke-linejoin='round'
      class={className}
    >
      {node.map(([tag, props], index) => {
        const Tag = tag;
        return <Tag key={`${tag}-${index}`} {...props} />;
      })}
    </svg>
  );
}
