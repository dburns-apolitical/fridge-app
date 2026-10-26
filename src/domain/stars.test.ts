import { describe, expect, it } from 'vitest';
import type { ICriterion } from './model';
import { applyCriterionOrder, weekScore } from './stars';

const teeth: ICriterion = { id: 'teeth', label: 'Teeth' };
const bed: ICriterion = { id: 'bed', label: 'Bed' };

describe('weekScore', () => {
  it('counts stars against that week’s own criteria', () => {
    expect(
      weekScore({
        criteria: [teeth, bed],
        stars: { 'teeth:mon': true, 'teeth:tue': true, 'bed:sun': true, 'gone:mon': true },
      }),
    ).toEqual({ earned: 3, possible: 14 });
  });

  it('is zero when the week has no criteria', () => {
    expect(weekScore({ criteria: [], stars: {} })).toEqual({ earned: 0, possible: 0 });
  });
});

describe('applyCriterionOrder', () => {
  it('reorders active rows and leaves retired rows where they are', () => {
    const water: ICriterion = { id: 'water', label: 'Water' };
    expect(applyCriterionOrder([teeth, bed, water], [water, bed])).toEqual([teeth, water, bed]);
  });
});
