import { context } from "ilha";

type LocaleCode = "en" | "no";

export const LOCALES: { code: LocaleCode; label: string; flag: string }[] = [
  { code: "en" as const, label: "English", flag: "🇬🇧" },
  { code: "no" as const, label: "Norsk", flag: "🇳🇴" },
];

export const locale = context("locale", "en" as LocaleCode);

export function initLocale() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem("locale") as LocaleCode | null;
  if (saved === "en" || saved === "no") {
    locale(saved);
    return;
  }
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("no") || lang.startsWith("nb") || lang.startsWith("nn")) {
    locale("no");
  }
}

export function setLocale(code: LocaleCode) {
  locale(code);
  localStorage.setItem("locale", code);
}
