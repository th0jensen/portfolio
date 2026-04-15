import { en } from "./en";
import { no } from "./no";
import type { LocaleCode } from "../lib/locale";

export const locales = { en, no } as const;

export function t(code: LocaleCode): typeof en {
  return locales[code] ?? en;
}
