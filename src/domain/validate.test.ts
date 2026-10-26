import { describe, expect, it } from 'vitest';
import { createEmptyData, emptyMeals, emptyWeek } from './model';
import { clampSoonDays, parseAppData } from './validate';

const validItem = {
  id: 'a1',
  name: 'Milk',
  quantity: '2 pints',
  expiry: '2026-10-12',
  compartment: 'fridge-door',
  addedAt: '2026-10-11T08:00:00.000Z',
};

const v1 = (items: unknown[], soonDays: unknown = 3) => ({
  version: 1,
  items,
  settings: { soonDays },
});

const migrated = (items: unknown[], soonDays = 3) => ({
  ...createEmptyData(),
  items,
  settings: { soonDays, starCriteria: [] },
  meals: emptyMeals(),
  weeks: [emptyWeek()],
});

describe('parseAppData', () => {
  it('migrates a version 1 document and keeps items and soon days', () => {
    expect(parseAppData(v1([validItem], 5))).toEqual(migrated([validItem], 5));
  });

  it('migrates a version 1 item that has no quantity or expiry', () => {
    const bare = { id: 'a1', name: 'Milk', compartment: 'fridge-door', addedAt: '2026-10-11T08:00:00.000Z' };
    expect(parseAppData(v1([bare]))?.items[0]).toEqual(bare);
    expect(parseAppData(v1([bare]))?.version).toBe(2);
  });

  it('accepts a version 2 document', () => {
    const data = {
      ...createEmptyData(),
      items: [validItem],
      settings: { soonDays: 4, starCriteria: [{ id: 'teeth', label: 'Teeth' }] },
      meals: { ...emptyMeals(), mon: 'Pasta' },
      weeks: [{ criteria: [{ id: 'teeth', label: 'Teeth' }], stars: { 'teeth:mon': true } }],
    };
    expect(parseAppData(data)).toEqual(data);
  });

  it.each([
    ['an unknown compartment', { ...validItem, compartment: 'garage' }],
    ['a non-ISO expiry date', { ...validItem, expiry: '11/10/2026' }],
    ['a blank name', { ...validItem, name: '   ' }],
    ['a missing id', { ...validItem, id: undefined }],
    ['a numeric quantity', { ...validItem, quantity: 2 }],
  ])('rejects a version 1 item with %s', (_label, bad) => {
    expect(parseAppData(v1([validItem, bad]))).toBeNull();
  });

  it.each([
    null,
    'hello',
    [],
    { version: 3, items: [], settings: { soonDays: 3 } },
    { version: 1, items: {} },
    { version: 2, items: [], settings: { soonDays: 3 } },
  ])('rejects %j', (value) => {
    expect(parseAppData(value)).toBeNull();
  });

  it('rejects a non-numeric soonDays', () => {
    expect(parseAppData(v1([], 'three'))).toBeNull();
  });

  it('clamps soonDays into range while migrating', () => {
    expect(parseAppData(v1([], 99))?.settings.soonDays).toBe(30);
    expect(parseAppData(v1([], -2))?.settings.soonDays).toBe(0);
  });

  it('keeps a cupboard item', () => {
    const rice = { ...validItem, compartment: 'cupboard-shelf-1', name: 'Rice' };
    expect(parseAppData({ ...createEmptyData(), items: [rice] })?.items[0]).toEqual(rice);
  });
});

describe('clampSoonDays', () => {
  it('rounds and clamps', () => {
    expect(clampSoonDays(2.6)).toBe(3);
    expect(clampSoonDays(31)).toBe(30);
    expect(clampSoonDays(-1)).toBe(0);
  });
});
