import { describe, expect, it } from 'vitest';
import { backupFileName, exportJson, importJson } from './backup';
import type { IAppData } from './model';

const sample: IAppData = {
  version: 1,
  items: [
    {
      id: 'a',
      name: 'Milk',
      expiry: '2026-10-12',
      compartment: 'fridge-door',
      addedAt: '2026-10-11T08:00:00.000Z',
    },
  ],
  settings: { soonDays: 3 },
};

describe('backup', () => {
  it('round-trips through JSON', () => {
    expect(importJson(exportJson(sample))).toEqual(sample);
  });

  it('rejects text that is not JSON', () => {
    expect(() => importJson('hello')).toThrow("That file isn't valid JSON.");
  });

  it('rejects JSON that is not a fridge backup', () => {
    expect(() => importJson('{"version":1,"items":[{"name":"x","compartment":"garage"}],"settings":{"soonDays":3}}')).toThrow(
      "That file isn't a fridge backup.",
    );
  });

  it('names the file with the date', () => {
    expect(backupFileName('2026-10-11')).toBe('fridge-backup-2026-10-11.json');
  });
});
