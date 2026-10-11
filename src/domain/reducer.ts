import type { IAppData, IItem, IItemFields, TCompartmentId } from './model';
import { clampSoonDays } from './validate';

export type TAction =
  | { type: 'add'; item: IItem }
  | { type: 'update'; id: string; fields: IItemFields }
  | { type: 'remove'; id: string }
  | { type: 'setSoonDays'; soonDays: number }
  | { type: 'replaceAll'; data: IAppData };

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const normaliseFields = (fields: IItemFields): Pick<IItem, 'name' | 'quantity' | 'expiry'> => {
  const quantity = fields.quantity.trim();
  const expiry = fields.expiry.trim();
  return {
    name: fields.name.trim(),
    ...(quantity ? { quantity } : {}),
    ...(expiry ? { expiry } : {}),
  };
};

export const createItem = (fields: IItemFields, compartment: TCompartmentId, now: Date = new Date()): IItem => ({
  id: newId(),
  compartment,
  addedAt: now.toISOString(),
  ...normaliseFields(fields),
});

export const toFields = (item: IItem): IItemFields => ({
  name: item.name,
  quantity: item.quantity ?? '',
  expiry: item.expiry ?? '',
});

const applyFields = (item: IItem, fields: IItemFields): IItem => ({
  id: item.id,
  compartment: item.compartment,
  addedAt: item.addedAt,
  ...normaliseFields(fields),
});

export const reduce = (data: IAppData, action: TAction): IAppData => {
  switch (action.type) {
    case 'add':
      return { ...data, items: [...data.items, action.item] };
    case 'update':
      return {
        ...data,
        items: data.items.map((item) => (item.id === action.id ? applyFields(item, action.fields) : item)),
      };
    case 'remove':
      return { ...data, items: data.items.filter((item) => item.id !== action.id) };
    case 'setSoonDays':
      return { ...data, settings: { ...data.settings, soonDays: clampSoonDays(action.soonDays) } };
    case 'replaceAll':
      return action.data;
  }
};
