import { atom, type AtomHandle } from 'ilha';

export type LocaleCode = 'en' | 'no';

let current: LocaleCode = 'en';
const mounted = new Map<object, AtomHandle<LocaleCode>>();

export function useLocale(): AtomHandle<LocaleCode> {
  // Locale belongs to the browser, not the server's English hydration snapshot.
  const value = atom(current, { snapshot: false });
  if (typeof window !== 'undefined') mounted.set(value.atom, value);
  return value;
}

export function initLocale(): void {
  const saved = localStorage.getItem('locale');
  const preferred = saved === 'en' || saved === 'no' ? saved : undefined;
  current = preferred ??
    (/no|^nb|^nn/.test(navigator.language.toLowerCase()) ? 'no' : 'en');
  applyDocumentLocale(current);
}

export function setLocale(code: LocaleCode): void {
  current = code;
  localStorage.setItem('locale', code);
  applyDocumentLocale(code);
  for (const value of mounted.values()) value.set(code);
}

function applyDocumentLocale(code: LocaleCode): void {
  document.documentElement.dataset.locale = code;
  document.documentElement.lang = code === 'no' ? 'nb' : 'en';
}
