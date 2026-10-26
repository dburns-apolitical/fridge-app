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

describe('star chart and meals', () => {
  const add = (data: IAppData, label: string) => reduce(data, { type: 'addCriterion', label });

  it('adds a criterion to the live list and the current week only', () => {
    const started = reduce(add(createEmptyData(), 'Teeth'), { type: 'newWeek' });
    const next = add(started, 'Bed');
    expect(next.settings.starCriteria.map((criterion) => criterion.label)).toEqual(['Teeth', 'Bed']);
    expect(next.weeks[0].criteria.map((criterion) => criterion.label)).toEqual(['Teeth']);
    expect(next.weeks[1].criteria.map((criterion) => criterion.label)).toEqual(['Teeth', 'Bed']);
  });

  it('ignores an empty criterion and stops at the cap', () => {
    expect(add(createEmptyData(), '   ').settings.starCriteria).toEqual([]);
    let data = createEmptyData();
    for (let n = 0; n < 13; n += 1) data = add(data, `Row ${n}`);
    expect(data.settings.starCriteria).toHaveLength(12);
  });

  it('renames the current week and leaves earlier weeks with the old label', () => {
    let data = add(createEmptyData(), 'Teeth');
    data = reduce(data, { type: 'newWeek' });
    const id = data.settings.starCriteria[0].id;
    data = reduce(data, { type: 'renameCriterion', id, label: 'Brushing' });
    expect(data.weeks[0].criteria[0].label).toBe('Teeth');
    expect(data.weeks[1].criteria[0].label).toBe('Brushing');
    expect(data.settings.starCriteria[0].label).toBe('Brushing');
  });

  it('appends an empty week and does not clear meals or earlier stars', () => {
    let data = add(createEmptyData(), 'Teeth');
    const id = data.settings.starCriteria[0].id;
    data = reduce(data, { type: 'toggleStar', weekIndex: 0, criterionId: id, day: 'mon' });
    data = reduce(data, { type: 'setMeal', day: 'mon', text: 'Pasta' });
    const next = reduce(data, { type: 'newWeek' });
    expect(next.weeks).toHaveLength(2);
    expect(next.weeks[0].stars).toEqual({ [`${id}:mon`]: true });
    expect(next.weeks[1]).toEqual({ criteria: [{ id, label: 'Teeth' }], stars: {} });
    expect(next.meals.mon).toBe('Pasta');
  });

  it('keeps a starred row when its criterion is removed, including on earlier weeks', () => {
    let data = add(createEmptyData(), 'Teeth');
    const id = data.settings.starCriteria[0].id;
    data = reduce(data, { type: 'toggleStar', weekIndex: 0, criterionId: id, day: 'wed' });
    data = reduce(data, { type: 'newWeek' });
    data = reduce(data, { type: 'toggleStar', weekIndex: 1, criterionId: id, day: 'fri' });
    data = reduce(data, { type: 'removeCriterion', id });

    expect(data.settings.starCriteria).toEqual([]);
    expect(data.weeks[0].criteria.map((criterion) => criterion.label)).toEqual(['Teeth']);
    expect(data.weeks[0].stars).toEqual({ [`${id}:wed`]: true });
    expect(data.weeks[1].criteria.map((criterion) => criterion.label)).toEqual(['Teeth']);
    expect(data.weeks[1].stars).toEqual({ [`${id}:fri`]: true });

    const third = reduce(data, { type: 'newWeek' });
    expect(third.weeks[2].criteria).toEqual([]);
    expect(third.weeks[0].stars).toEqual({ [`${id}:wed`]: true });
  });

  it('drops an unused row from the current week only', () => {
    let data = add(createEmptyData(), 'Teeth');
    const id = data.settings.starCriteria[0].id;
    data = reduce(data, { type: 'toggleStar', weekIndex: 0, criterionId: id, day: 'mon' });
    data = reduce(data, { type: 'newWeek' });
    data = reduce(data, { type: 'removeCriterion', id });
    expect(data.weeks[0].criteria).toHaveLength(1);
    expect(data.weeks[0].stars).toEqual({ [`${id}:mon`]: true });
    expect(data.weeks[1].criteria).toEqual([]);
    expect(data.settings.starCriteria).toEqual([]);
  });

  it('toggles stars on an earlier week', () => {
    let data = add(createEmptyData(), 'Teeth');
    const id = data.settings.starCriteria[0].id;
    data = reduce(data, { type: 'newWeek' });
    data = reduce(data, { type: 'toggleStar', weekIndex: 0, criterionId: id, day: 'sun' });
    expect(data.weeks[0].stars).toEqual({ [`${id}:sun`]: true });
    data = reduce(data, { type: 'toggleStar', weekIndex: 0, criterionId: id, day: 'sun' });
    expect(data.weeks[0].stars).toEqual({});
  });

  it('reorders live criteria and leaves a kept row in place', () => {
    let data = add(add(createEmptyData(), 'Teeth'), 'Bed');
    const [teeth, bed] = data.settings.starCriteria;
    data = reduce(data, { type: 'toggleStar', weekIndex: 0, criterionId: teeth.id, day: 'mon' });
    data = reduce(data, { type: 'removeCriterion', id: teeth.id });
    data = add(data, 'Water');
    data = reduce(data, { type: 'moveCriterion', id: data.settings.starCriteria[1].id, direction: 'up' });
    expect(data.settings.starCriteria.map((criterion) => criterion.label)).toEqual(['Water', 'Bed']);
    expect(data.weeks[0].criteria.map((criterion) => criterion.id)).toEqual([
      teeth.id,
      data.settings.starCriteria[0].id,
      bed.id,
    ]);
  });
});

describe('toFields', () => {
  it('maps missing optional fields to empty strings', () => {
    expect(toFields({ ...milk, quantity: undefined, expiry: undefined })).toEqual({ name: 'Milk', quantity: '', expiry: '' });
    expect(toFields(milk)).toEqual({ name: 'Milk', quantity: '2 pints', expiry: '2026-10-12' });
  });
});
