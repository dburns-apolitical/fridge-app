import { isCompartmentId } from './compartments';
import { MAX_SOON_DAYS, type IAppData, type IItem } from './model';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const clampSoonDays = (n: number): number => Math.min(MAX_SOON_DAYS, Math.max(0, Math.round(n)));

export const parseItem = (value: unknown): IItem | null => {
  if (!isRecord(value)) return null;
  const { id, name, quantity, expiry, compartment, addedAt } = value;
  if (typeof id !== 'string' || id === '') return null;
  if (typeof name !== 'string' || name.trim() === '') return null;
  if (quantity !== undefined && typeof quantity !== 'string') return null;
  if (expiry !== undefined && (typeof expiry !== 'string' || !ISO_DATE.test(expiry))) return null;
  if (!isCompartmentId(compartment)) return null;
  if (typeof addedAt !== 'string') return null;
  return {
    id,
    name,
    compartment,
    addedAt,
    ...(quantity ? { quantity } : {}),
    ...(expiry ? { expiry } : {}),
  };
};

export const parseAppData = (value: unknown): IAppData | null => {
  if (!isRecord(value) || value.version !== 1) return null;
  if (!Array.isArray(value.items) || !isRecord(value.settings)) return null;

  const items: IItem[] = [];
  for (const raw of value.items) {
    const item = parseItem(raw);
    if (!item) return null;
    items.push(item);
  }

  const { soonDays } = value.settings;
  if (typeof soonDays !== 'number' || !Number.isFinite(soonDays)) return null;

  return { version: 1, items, settings: { soonDays: clampSoonDays(soonDays) } };
};
