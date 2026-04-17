import { context } from "ilha";
import type { Data } from "../types/Data";
import type { HeaderData } from "../types/HeaderData";

export const dataSignal = context("appData", null as unknown as Data);

// Used by the prerender script to supply data without a DOM
let _ssrData: Data | null = null;
export function setData(d: Data): void {
  _ssrData = d;
}

// Used by page components (prerender script only — tree-shaken from browser bundle)
export function getData(): Data {
  if (_ssrData) return _ssrData;
  const el = document.getElementById("__DATA__")!;
  return JSON.parse(el.textContent!) as Data;
}

// Used by the header island — works in both browser and prerender contexts
let _headerCache: HeaderData | null = null;
export function getHeaderData(): HeaderData {
  if (_headerCache) return _headerCache;
  if (_ssrData) {
    _headerCache = {
      en: { nav: _ssrData.en.nav, buttons: _ssrData.en.buttons, theme: _ssrData.en.theme },
      no: { nav: _ssrData.no.nav, buttons: _ssrData.no.buttons, theme: _ssrData.no.theme },
    };
    return _headerCache;
  }
  const el = document.getElementById("__DATA__")!;
  _headerCache = JSON.parse(el.textContent!) as HeaderData;
  return _headerCache;
}
