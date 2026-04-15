import type { Data } from "../types/Data";

let cache: Data | null = null;

export async function getData(): Promise<Data> {
  if (cache) return cache;
  const res = await fetch("/api/data");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  cache = (await res.json()) as Data;
  return cache;
}
