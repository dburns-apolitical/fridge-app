import { createEmptyData, type IAppData } from './model';
import { parseAppData } from './validate';

export const STORAGE_KEY = 'fridge-app:data';

/** Reading `localStorage` itself can throw in some privacy modes. */
const defaultStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export const load = (store: Storage | undefined = defaultStorage()): IAppData => {
  try {
    const text = store?.getItem(STORAGE_KEY);
    if (!text) return createEmptyData();
    return parseAppData(JSON.parse(text)) ?? createEmptyData();
  } catch {
    return createEmptyData();
  }
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
