import { cn } from '../lib/cn.ts';

type Props = {
  mode: 'field' | 'image' | 'morph' | 'text';
  /** Grid pitch in CSS pixels; 20% tighter under 480px wide. */
  spacing?: number;
  /** image: picture to halftone. */
  src?: string;
  /** image: vertical crop focus in [0, 1], like object-position. */
  focusY?: number;
  /** morph: comma-separated shapes (gear, window, phone, glider, or a glyph). */
  shapes?: string;
  /** text: wordmark to render. */
  text?: string;
  /** Pointer lens radius in CSS pixels. */
  lens?: number;
  /** field: 0 spreads the wave evenly instead of fading it to the left. */
  fade?: 0 | 1;
  class?: string;
};

/** A canvas that lib/dot-matrix.ts draws into; it sizes itself to its box. */
export default function DotMatrix(props: Props) {
  return (
    <canvas
      aria-hidden='true'
      class={cn('dot-canvas', props.class)}
      data-dot-matrix={props.mode}
      data-spacing={props.spacing === undefined ? undefined : String(props.spacing)}
      data-src={props.src}
      data-focus-y={props.focusY === undefined ? undefined : String(props.focusY)}
      data-shapes={props.shapes}
      data-text={props.text}
      data-lens={props.lens === undefined ? undefined : String(props.lens)}
      data-fade={props.fade === undefined ? undefined : String(props.fade)}
      data-morph-preserve='width height'
    />
  );
}
