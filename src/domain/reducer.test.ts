import { describe, expect, it } from 'vitest';
import { createEmptyData, type IAppData, type IItem } from './model';
import { createItem, reduce, toFields } from './reducer';

const milk: IItem = {
  id: 'milk',
  name: 'Milk',
  quantity: '2 pints',
  expiry: '2026-10-12',
  compartment: 'fridge-door',
  addedAt: '2026-10-11T08:00:00.000Z',
};

const withMilk = (): IAppData => ({ ...createEmptyData(), items: [milk] });

describe('createItem', () => {
  it('trims the name and drops empty optional fields', () => {
    const item = createItem({ name: '  Peas  ', quantity: '  ', expiry: '' }, 'freezer-drawer-1', new Date('2026-10-11T08:00:00.000Z'));
    expect(item).toEqual({
      id: expect.any(String),
      name: 'Peas',
      compartment: 'freezer-drawer-1',
      addedAt: '2026-10-11T08:00:00.000Z',
    });
    expect('quantity' in item).toBe(false);
    expect('expiry' in item).toBe(false);
  });

  it('keeps quantity and expiry when given', () => {
    const item = createItem({ name: 'Ham', quantity: ' 4 slices ', expiry: '2026-10-13' }, 'fridge-shelf-2');
    expect(item.quantity).toBe('4 slices');
    expect(item.expiry).toBe('2026-10-13');
  });

  it('gives each item a different id', () => {
    const fields = { name: 'A', quantity: '', expiry: '' };
    expect(createItem(fields, 'fridge-door').id).not.toBe(createItem(fields, 'fridge-door').id);
  });
});

describe('reduce', () => {
  it('adds an item', () => {
    expect(reduce(createEmptyData(), { type: 'add', item: milk }).items).toEqual([milk]);
  });

  it('updates fields but keeps id, compartment and addedAt', () => {
    const next = reduce(withMilk(), {
      type: 'update',
      id: 'milk',
      fields: { name: ' Oat milk ', quantity: '1 carton', expiry: '2026-10-20' },
    });
    expect(next.items[0]).toEqual({ ...milk, name: 'Oat milk', quantity: '1 carton', expiry: '2026-10-20' });
  });

  it('removes the expiry and quantity when they are cleared', () => {
    const next = reduce(withMilk(), { type: 'update', id: 'milk', fields: { name: 'Milk', quantity: '', expiry: '' } });
    expect('expiry' in next.items[0]).toBe(false);
    expect('quantity' in next.items[0]).toBe(false);
  });

  it('removes an item', () => {
    expect(reduce(withMilk(), { type: 'remove', id: 'milk' }).items).toEqual([]);
  });

  it('clamps soon days', () => {
    expect(reduce(createEmptyData(), { type: 'setSoonDays', soonDays: 50 }).settings.soonDays).toBe(30);
  });

  it('replaces all data', () => {
    expect(reduce(createEmptyData(), { type: 'replaceAll', data: withMilk() })).toEqual(withMilk());
  });

  it('does not mutate the input', () => {
    const before = withMilk();
    reduce(before, { type: 'remove', id: 'milk' });
    expect(before.items).toHaveLength(1);
  });
});

describe('toFields', () => {
  it('maps missing optional fields to empty strings', () => {
    expect(toFields({ ...milk, quantity: undefined, expiry: undefined })).toEqual({ name: 'Milk', quantity: '', expiry: '' });
    expect(toFields(milk)).toEqual({ name: 'Milk', quantity: '2 pints', expiry: '2026-10-12' });
  });
});
