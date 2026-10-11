import { describe, expect, it } from 'vitest';
import { createEmptyData, type IAppData } from './model';
import { CORRUPT_KEY, load, save, STORAGE_KEY } from './storage';

const memoryStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
};

const throwingStorage = (): Storage => ({
  ...memoryStorage(),
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
});

const sample: IAppData = {
  version: 1,
  items: [{ id: 'a', name: 'Peas', compartment: 'freezer-drawer-1', addedAt: '2026-10-11T08:00:00.000Z' }],
  settings: { soonDays: 5 },
};

describe('storage', () => {
  it('returns empty data when nothing is stored', () => {
    expect(load(memoryStorage())).toEqual(createEmptyData());
  });

  it('round-trips saved data', () => {
    const store = memoryStorage();
    expect(save(sample, store)).toBe(true);
    expect(load(store)).toEqual(sample);
  });

  it('falls back to empty data when stored JSON is corrupt', () => {
    const store = memoryStorage();
    store.setItem(STORAGE_KEY, '{not json');
    expect(load(store)).toEqual(createEmptyData());
  });

  it('falls back to empty data when stored data has the wrong shape', () => {
    const store = memoryStorage();
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: 'nope' }));
    expect(load(store)).toEqual(createEmptyData());
  });

  it('keeps a copy of corrupt JSON under CORRUPT_KEY before falling back', () => {
    const store = memoryStorage();
    store.setItem(STORAGE_KEY, '{not json');
    expect(load(store)).toEqual(createEmptyData());
    expect(store.getItem(CORRUPT_KEY)).toBe('{not json');
  });

  it('keeps a copy of wrong-shape data under CORRUPT_KEY before falling back', () => {
    const store = memoryStorage();
    const bad = JSON.stringify({ version: 1, items: 'nope' });
    store.setItem(STORAGE_KEY, bad);
    expect(load(store)).toEqual(createEmptyData());
    expect(store.getItem(CORRUPT_KEY)).toBe(bad);
  });

  it('does not overwrite an existing corrupt copy', () => {
    const store = memoryStorage();
    store.setItem(CORRUPT_KEY, 'first copy');
    store.setItem(STORAGE_KEY, '{not json');
    expect(load(store)).toEqual(createEmptyData());
    expect(store.getItem(CORRUPT_KEY)).toBe('first copy');
  });

  it('still returns empty data when keeping the corrupt copy fails', () => {
    const store: Storage = {
      ...memoryStorage(),
      getItem: () => '{not json',
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(load(store)).toEqual(createEmptyData());
  });

  it('never throws when storage is unavailable or full', () => {
    expect(load(throwingStorage())).toEqual(createEmptyData());
    expect(save(sample, throwingStorage())).toBe(false);
  });

  it('uses localStorage by default', () => {
    expect(save(sample)).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(sample);
    expect(load()).toEqual(sample);
  });
});
