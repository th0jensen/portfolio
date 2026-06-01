import type { IconNode } from 'lucide';

export default function icon(node: IconNode, size = 24, attrs = ''): string {
  const children = node
    .map(([tag, props]) => {
      const a = Object.entries(props)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${a}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${attrs}>${children}</svg>`;
}
