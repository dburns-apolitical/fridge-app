import { describe, expect, it } from 'vitest';
import { clampSoonDays, parseAppData } from './validate';

const validItem = {
  id: 'a1',
  name: 'Milk',
  quantity: '2 pints',
  expiry: '2026-10-12',
  compartment: 'fridge-door',
  addedAt: '2026-10-11T08:00:00.000Z',
};

const withItems = (items: unknown[], soonDays: unknown = 3) => ({
  version: 1,
  items,
  settings: { soonDays },
});

describe('parseAppData', () => {
  it('accepts valid data', () => {
    expect(parseAppData(withItems([validItem]))).toEqual(withItems([validItem]));
  });

  it('accepts items without quantity or expiry', () => {
    const bare = { id: 'a1', name: 'Milk', compartment: 'fridge-door', addedAt: '2026-10-11T08:00:00.000Z' };
    expect(parseAppData(withItems([bare]))?.items[0]).toEqual(bare);
  });

  it.each([
    ['an unknown compartment', { ...validItem, compartment: 'garage' }],
    ['a non-ISO expiry date', { ...validItem, expiry: '11/10/2026' }],
    ['a blank name', { ...validItem, name: '   ' }],
    ['a missing id', { ...validItem, id: undefined }],
    ['a numeric quantity', { ...validItem, quantity: 2 }],
  ])('rejects an item with %s', (_label, bad) => {
    expect(parseAppData(withItems([validItem, bad]))).toBeNull();
  });

  it.each([null, 'hello', [], { version: 2, items: [], settings: { soonDays: 3 } }, { version: 1, items: {} }])(
    'rejects %j',
    (value) => {
      expect(parseAppData(value)).toBeNull();
    },
  );

  it('rejects a non-numeric soonDays', () => {
    expect(parseAppData(withItems([], 'three'))).toBeNull();
  });

  it('clamps soonDays into range', () => {
    expect(parseAppData(withItems([], 99))?.settings.soonDays).toBe(30);
    expect(parseAppData(withItems([], -2))?.settings.soonDays).toBe(0);
  });
});

describe('clampSoonDays', () => {
  it('rounds and clamps', () => {
    expect(clampSoonDays(2.6)).toBe(3);
    expect(clampSoonDays(31)).toBe(30);
    expect(clampSoonDays(-1)).toBe(0);
  });
});
