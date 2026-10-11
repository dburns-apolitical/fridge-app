import { createEmptyData, type IAppData } from './model';
import { parseAppData } from './validate';

export const STORAGE_KEY = 'fridge-app:data';
/** Holds the first unreadable copy of stored data, so a later save cannot destroy it. */
export const CORRUPT_KEY = 'fridge-app:data.corrupt';

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

export const load = (store: Storage | undefined = defaultStorage()): IAppData => {
  const text = readText(store);
  if (!text) return createEmptyData();
  try {
    const data = parseAppData(JSON.parse(text));
    if (data) return data;
  } catch {
    // Unparseable JSON is handled below, alongside data of the wrong shape.
  }
  if (store) keepCorruptCopy(store, text);
  return createEmptyData();
};

export const save = (data: IAppData, store: Storage | undefined = defaultStorage()): boolean => {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};
