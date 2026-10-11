export type TCompartmentId =
  | 'fridge-shelf-1'
  | 'fridge-shelf-2'
  | 'fridge-shelf-3'
  | 'fridge-door'
  | 'freezer-drawer-1'
  | 'freezer-drawer-2'
  | 'freezer-drawer-3';

export type TSection = 'fridge' | 'freezer';
export type TCompartmentKind = 'shelf' | 'door' | 'drawer';

export interface IItem {
  id: string;
  name: string;
  quantity?: string;
  expiry?: string;
  compartment: TCompartmentId;
  addedAt: string;
}

/** Values as typed into the item form. An empty string means "not set". */
export interface IItemFields {
  name: string;
  quantity: string;
  expiry: string;
}

export interface ISettings {
  soonDays: number;
}

export interface IAppData {
  version: 1;
  items: IItem[];
  settings: ISettings;
}

export const DEFAULT_SOON_DAYS = 3;
export const MAX_SOON_DAYS = 30;

export const createEmptyData = (): IAppData => ({
  version: 1,
  items: [],
  settings: { soonDays: DEFAULT_SOON_DAYS },
});
