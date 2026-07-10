import { context } from 'ilha';

type LocaleCode = 'en' | 'no';

export const locale = context('locale', 'en' as LocaleCode);

export function initLocale() {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem('locale') as LocaleCode | null;
  if (saved === 'en' || saved === 'no') {
    locale(saved);
    document.documentElement.lang = saved === 'no' ? 'nb' : 'en';
    return;
  }
  const lang = navigator.language.toLowerCase();
  if (lang.includes('no') || lang.startsWith('nb') || lang.startsWith('nn')) {
    locale('no');
    document.documentElement.lang = 'nb';
  } else {
    document.documentElement.lang = 'en';
  }
}

export function setLocale(code: LocaleCode) {
  locale(code);
  localStorage.setItem('locale', code);
}
