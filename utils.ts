import { createDefine } from "fresh";
import type { TranslationState } from "fresh-i18n";

export interface State {
  title?: string;
}

export type ExtendedState = State & TranslationState;

export const define = createDefine<ExtendedState>();
