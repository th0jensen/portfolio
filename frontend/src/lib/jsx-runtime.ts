import type { JSX as Ilha } from 'ilha/jsx-runtime';

export { Fragment, h, jsx, jsxDEV, jsxs } from 'ilha/jsx-runtime';

/**
 * Ilha 0.14 declares `ElementType` with a `Record<string, unknown>` parameter, so any
 * component that types its own props fails assignability, and it omits
 * `IntrinsicAttributes`, so `key` has to be redeclared per component. Re-export the
 * runtime untouched and patch only those two. Drop this file once Ilha ships the fix.
 */
export declare namespace JSX {
  type Element = Ilha.Element;
  type ElementChildrenAttribute = Ilha.ElementChildrenAttribute;
  type IntrinsicElements = Ilha.IntrinsicElements;
  // deno-lint-ignore no-explicit-any
  type ElementType = string | ((props: any) => unknown);
  interface IntrinsicAttributes {
    key?: string | number;
  }
}
