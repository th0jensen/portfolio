import { atom } from 'ilha';
import type { Data, ExperienceItem } from '../bindings/index.ts';

type ServerData = { data: Data; experience: ExperienceItem[] };

let current: ServerData;

export const setServerData = (value: ServerData) => (current = value);

export function useServerData<T>(select: (value: ServerData) => T): T {
  return atom<T>(
    typeof window === 'undefined' ? select(current) : (undefined as T),
  )();
}
