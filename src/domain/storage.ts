import { createEmptyData, type IAppData } from './model';
import { parseStored } from './validate';

export const STORAGE_KEY = 'fridge-app:data';
/** Holds the first unreadable copy of stored data, so a later save cannot destroy it. */
export const CORRUPT_KEY = 'fridge-app:data.corrupt';

export interface ILoadResult {
  data: IAppData;
  saveFailed: boolean;
}

/** Reading `localStorage` itself can throw in some privacy modes. */
const defaultStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const readText = (store: Storage | undefined): string | null => {
  try {
    return store?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
};

/** Best-effort: keeps the first copy only, and never throws. */
const keepCorruptCopy = (store: Storage, text: string): void => {
  try {
    if (store.getItem(CORRUPT_KEY) === null) store.setItem(CORRUPT_KEY, text);
  } catch {
    // Storage is unavailable or full; falling back to empty data is still the right outcome.
  }
};

/**
 * Loads the document. A readable version 1 blob is upgraded and written back as version 2.
 * If that write fails, the upgraded data is still returned and `saveFailed` is true.
 * Unreadable data is left in place.
 */
export const loadResult = (store: Storage | undefined = defaultStorage()): ILoadResult => {
  const text = readText(store);
  if (!text) return { data: createEmptyData(), saveFailed: false };
  try {
    const parsed = parseStored(JSON.parse(text));
    if (parsed) {
      if (!parsed.migrated) return { data: parsed.data, saveFailed: false };
      const saved = save(parsed.data, store);
      return { data: parsed.data, saveFailed: !saved };
    }
  } catch {
    // Unparseable JSON is handled below, alongside data of the wrong shape.
  }
  if (store) keepCorruptCopy(store, text);
  return { data: createEmptyData(), saveFailed: false };
};

export const load = (store: Storage | undefined = defaultStorage()): IAppData => loadResult(store).data;

export const save = (data: IAppData, store: Storage | undefined = defaultStorage()): boolean => {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};
