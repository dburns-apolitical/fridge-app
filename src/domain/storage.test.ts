import { describe, expect, it } from 'vitest';
import { createEmptyData, type IAppData, type IItem } from './model';
import { CORRUPT_KEY, load, loadResult, save, STORAGE_KEY } from './storage';

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

const peas: IItem = { id: 'a', name: 'Peas', compartment: 'freezer-drawer-1', addedAt: '2026-10-11T08:00:00.000Z' };

const sample: IAppData = {
  ...createEmptyData(),
  items: [peas],
  settings: { soonDays: 5, starCriteria: [] },
};

const version1 = {
  version: 1,
  items: [peas],
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

  it('rewrites a version 1 blob to version 2 without losing items', () => {
    const store = memoryStorage();
    store.setItem(STORAGE_KEY, JSON.stringify(version1));

    const loaded = load(store);

    expect(loaded.items).toEqual([peas]);
    expect(loaded.settings.soonDays).toBe(5);
    expect(loaded.version).toBe(2);
    expect(loaded.settings.starCriteria).toEqual([]);
    expect(loaded.weeks).toEqual([{ criteria: [], stars: {} }]);
    expect(JSON.parse(store.getItem(STORAGE_KEY)!)).toEqual(loaded);
  });

  it('keeps migrated data when a version 1 blob cannot be rewritten', () => {
    const store = memoryStorage();
    const original = JSON.stringify(version1);
    store.setItem(STORAGE_KEY, original);
    const write = store.setItem.bind(store);
    store.setItem = (key, value) => {
      if (key === STORAGE_KEY) throw new Error('QuotaExceededError');
      write(key, value);
    };

    const result = loadResult(store);

    expect(result.saveFailed).toBe(true);
    expect(result.data.items).toEqual([peas]);
    expect(result.data.version).toBe(2);
    expect(store.getItem(STORAGE_KEY)).toBe(original);
  });

  it('does not overwrite a version 1 blob it cannot read', () => {
    const store = memoryStorage();
    const bad = JSON.stringify({ version: 1, items: [{ id: 'a' }], settings: { soonDays: 3 } });
    store.setItem(STORAGE_KEY, bad);

    expect(load(store)).toEqual(createEmptyData());
    expect(store.getItem(STORAGE_KEY)).toBe(bad);
    expect(store.getItem(CORRUPT_KEY)).toBe(bad);
  });

  it('uses localStorage by default', () => {
    expect(save(sample)).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(sample);
    expect(load()).toEqual(sample);
  });
});
