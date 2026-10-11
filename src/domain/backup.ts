import type { IAppData } from './model';
import { parseAppData } from './validate';

export const exportJson = (data: IAppData): string => JSON.stringify(data, null, 2);

export const importJson = (text: string): IAppData => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const data = parseAppData(raw);
  if (!data) throw new Error("That file isn't a fridge backup.");
  return data;
};

export const backupFileName = (today: string): string => `fridge-backup-${today}.json`;
