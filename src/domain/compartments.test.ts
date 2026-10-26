import { describe, expect, it } from 'vitest';
import { COMPARTMENTS, compartmentName, compartmentPlace, isCompartmentId } from './compartments';

describe('compartments', () => {
  it('has three fridge shelves and a door', () => {
    expect(COMPARTMENTS.filter((c) => c.section === 'fridge').map((c) => c.name)).toEqual([
      'Top shelf',
      'Middle shelf',
      'Bottom shelf',
      'Door',
    ]);
  });

  it('has three freezer drawers', () => {
    expect(COMPARTMENTS.filter((c) => c.section === 'freezer').map((c) => c.name)).toEqual([
      'Top drawer',
      'Middle drawer',
      'Bottom drawer',
    ]);
  });

  it('has three cupboard shelves', () => {
    expect(COMPARTMENTS.filter((c) => c.section === 'cupboard').map((c) => c.name)).toEqual([
      'Top shelf',
      'Middle shelf',
      'Bottom shelf',
    ]);
  });

  it('names a compartment by id', () => {
    expect(compartmentName('freezer-drawer-2')).toBe('Middle drawer');
    expect(compartmentPlace('cupboard-shelf-1')).toBe('Cupboard · Top shelf');
    expect(compartmentPlace('fridge-shelf-1')).toBe('Top shelf');
  });

  it('recognises compartment ids', () => {
    expect(isCompartmentId('fridge-door')).toBe(true);
    expect(isCompartmentId('garage')).toBe(false);
    expect(isCompartmentId(3)).toBe(false);
  });
});
