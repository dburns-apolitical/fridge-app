import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysUntil,
  describeExpiry,
  expiryStatus,
  getUseSoonItems,
  sortItems,
  todayIso,
} from './expiry';
import type { IItem } from './model';

const item = (name: string, expiry?: string): IItem => ({
  id: name,
  name,
  compartment: 'fridge-shelf-1',
  addedAt: '2026-10-01T09:00:00.000Z',
  ...(expiry ? { expiry } : {}),
});

describe('todayIso', () => {
  it('uses the local date, not UTC, just after midnight in BST', () => {
    // 00:30 on 11 October in London is 23:30 on 10 October in UTC.
    expect(todayIso(new Date(2026, 9, 11, 0, 30))).toBe('2026-10-11');
  });
});

describe('addDays and daysUntil', () => {
  it('crosses month ends', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-11-02', -3)).toBe('2026-10-30');
  });

  it('counts days between dates', () => {
    expect(daysUntil('2026-10-14', '2026-10-11')).toBe(3);
    expect(daysUntil('2026-10-10', '2026-10-11')).toBe(-1);
  });
});

describe('expiryStatus', () => {
  const today = '2026-10-11';

  it.each([
    [undefined, 'none'],
    ['2026-10-10', 'expired'],
    ['2026-10-11', 'soon'],
    ['2026-10-14', 'soon'],
    ['2026-10-15', 'ok'],
  ] as const)('expiry %s is %s with 3 soon days', (expiry, status) => {
    expect(expiryStatus({ expiry }, today, 3)).toBe(status);
  });

  it('treats today as soon when soon days is 0', () => {
    expect(expiryStatus({ expiry: today }, today, 0)).toBe('soon');
    expect(expiryStatus({ expiry: '2026-10-12' }, today, 0)).toBe('ok');
  });
});

describe('describeExpiry', () => {
  const today = '2026-10-11';

  it.each([
    ['2026-10-08', 'Expired 3 days ago'],
    ['2026-10-10', 'Expired yesterday'],
    ['2026-10-11', 'Expires today'],
    ['2026-10-12', 'Expires tomorrow'],
    ['2026-10-16', 'Expires in 5 days'],
    ['2026-11-03', 'Expires 3 Nov'],
    ['2027-01-05', 'Expires 5 Jan 2027'],
  ])('describes %s as "%s"', (expiry, text) => {
    expect(describeExpiry(expiry, today)).toBe(text);
  });
});

describe('sortItems', () => {
  it('puts dated items first by expiry, then undated items by name', () => {
    const sorted = sortItems([
      item('Peas'),
      item('Milk', '2026-10-13'),
      item('Butter'),
      item('Ham', '2026-10-12'),
      item('Cream', '2026-10-12'),
    ]);
    expect(sorted.map((i) => i.name)).toEqual(['Cream', 'Ham', 'Milk', 'Butter', 'Peas']);
  });
});

describe('getUseSoonItems', () => {
  it('returns expired and soon items only, soonest first', () => {
    const result = getUseSoonItems(
      [item('Peas'), item('Yoghurt', '2026-10-20'), item('Milk', '2026-10-13'), item('Ham', '2026-10-09')],
      '2026-10-11',
      3,
    );
    expect(result.map((i) => i.name)).toEqual(['Ham', 'Milk']);
  });
});
