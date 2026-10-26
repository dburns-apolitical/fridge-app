export type TCompartmentId =
  | 'fridge-shelf-1'
  | 'fridge-shelf-2'
  | 'fridge-shelf-3'
  | 'fridge-door'
  | 'freezer-drawer-1'
  | 'freezer-drawer-2'
  | 'freezer-drawer-3'
  | 'cupboard-shelf-1'
  | 'cupboard-shelf-2'
  | 'cupboard-shelf-3';

export type TSection = 'fridge' | 'freezer' | 'cupboard';
export type TCompartmentKind = 'shelf' | 'door' | 'drawer';

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type TWeekday = (typeof WEEKDAYS)[number];

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

/** A star-chart row. Weeks keep their own copy so history is not rewritten. */
export interface ICriterion {
  id: string;
  label: string;
}

export interface ISettings {
  soonDays: number;
  /** Live rows. A new week copies this list. */
  starCriteria: ICriterion[];
}

/** One numbered star-chart week. Week 1 is index 0. Not tied to a calendar date. */
export interface IStarWeek {
  criteria: ICriterion[];
  /** Keys are `${criterionId}:${weekday}`. */
  stars: Record<string, true>;
}

export type TMeals = Record<TWeekday, string>;

export interface IAppData {
  version: 2;
  items: IItem[];
  settings: ISettings;
  meals: TMeals;
  weeks: IStarWeek[];
}

export const DEFAULT_SOON_DAYS = 3;
export const MAX_SOON_DAYS = 30;
export const MAX_CRITERIA = 12;
export const MAX_CRITERION_LABEL = 40;
export const MAX_MEAL_LENGTH = 120;

export const WEEKDAY_NAME: Record<TWeekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const WEEKDAY_INITIAL: Record<TWeekday, string> = {
  mon: 'M',
  tue: 'T',
  wed: 'W',
  thu: 'T',
  fri: 'F',
  sat: 'S',
  sun: 'S',
};

export const isWeekday = (value: unknown): value is TWeekday =>
  typeof value === 'string' && (WEEKDAYS as readonly string[]).includes(value);

export const emptyMeals = (): TMeals => ({
  mon: '',
  tue: '',
  wed: '',
  thu: '',
  fri: '',
  sat: '',
  sun: '',
});

export const emptyWeek = (): IStarWeek => ({ criteria: [], stars: {} });

export const createEmptyData = (): IAppData => ({
  version: 2,
  items: [],
  settings: { soonDays: DEFAULT_SOON_DAYS, starCriteria: [] },
  meals: emptyMeals(),
  weeks: [emptyWeek()],
});
