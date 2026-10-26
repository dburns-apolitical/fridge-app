import { isCompartmentId } from './compartments';
import {
  emptyMeals,
  emptyWeek,
  isWeekday,
  MAX_CRITERIA,
  MAX_CRITERION_LABEL,
  MAX_MEAL_LENGTH,
  MAX_SOON_DAYS,
  WEEKDAYS,
  type IAppData,
  type ICriterion,
  type IItem,
  type IStarWeek,
  type TMeals,
} from './model';

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

const parseItems = (value: unknown): IItem[] | null => {
  if (!Array.isArray(value)) return null;
  const items: IItem[] = [];
  for (const raw of value) {
    const item = parseItem(raw);
    if (!item) return null;
    items.push(item);
  }
  return items;
};

const parseSoonDays = (settings: unknown): number | null => {
  if (!isRecord(settings)) return null;
  const { soonDays } = settings;
  if (typeof soonDays !== 'number' || !Number.isFinite(soonDays)) return null;
  return clampSoonDays(soonDays);
};

const parseCriterion = (value: unknown): ICriterion | null => {
  if (!isRecord(value)) return null;
  const { id, label } = value;
  if (typeof id !== 'string' || id === '' || id.includes(':')) return null;
  if (typeof label !== 'string') return null;
  const trimmed = label.trim().slice(0, MAX_CRITERION_LABEL);
  if (trimmed === '') return null;
  return { id, label: trimmed };
};

const parseCriteria = (value: unknown, cap: number): ICriterion[] | null => {
  if (!Array.isArray(value)) return null;
  const criteria: ICriterion[] = [];
  for (const raw of value.slice(0, cap)) {
    const criterion = parseCriterion(raw);
    if (!criterion) return null;
    if (criteria.some((existing) => existing.id === criterion.id)) return null;
    criteria.push(criterion);
  }
  return criteria;
};

const parseMeals = (value: unknown): TMeals | null => {
  if (!isRecord(value)) return null;
  const meals = emptyMeals();
  for (const day of WEEKDAYS) {
    const text = value[day];
    if (text === undefined) continue;
    if (typeof text !== 'string') return null;
    meals[day] = text.slice(0, MAX_MEAL_LENGTH);
  }
  return meals;
};

const parseStars = (value: unknown, criteria: readonly ICriterion[]): Record<string, true> | null => {
  if (!isRecord(value)) return null;
  const ids = new Set(criteria.map((criterion) => criterion.id));
  const stars: Record<string, true> = {};
  for (const [key, starred] of Object.entries(value)) {
    if (starred !== true) continue;
    const splitAt = key.lastIndexOf(':');
    if (splitAt <= 0) continue;
    const id = key.slice(0, splitAt);
    const day = key.slice(splitAt + 1);
    if (!ids.has(id) || !isWeekday(day)) continue;
    stars[`${id}:${day}`] = true;
  }
  return stars;
};

const parseWeek = (value: unknown): IStarWeek | null => {
  if (!isRecord(value)) return null;
  const criteria = parseCriteria(value.criteria, Number.POSITIVE_INFINITY);
  if (!criteria) return null;
  const stars = parseStars(value.stars, criteria);
  if (!stars) return null;
  return { criteria, stars };
};

const parseWeeks = (value: unknown): IStarWeek[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const weeks: IStarWeek[] = [];
  for (const raw of value) {
    const week = parseWeek(raw);
    if (!week) return null;
    weeks.push(week);
  }
  return weeks;
};

const migrateV1 = (items: IItem[], soonDays: number): IAppData => ({
  version: 2,
  items,
  settings: { soonDays, starCriteria: [] },
  meals: emptyMeals(),
  weeks: [emptyWeek()],
});

const parseV2 = (value: Record<string, unknown>): IAppData | null => {
  const items = parseItems(value.items);
  const soonDays = parseSoonDays(value.settings);
  if (!items || soonDays === null || !isRecord(value.settings)) return null;
  const starCriteria = parseCriteria(value.settings.starCriteria, MAX_CRITERIA);
  const meals = parseMeals(value.meals);
  const weeks = parseWeeks(value.weeks);
  if (!starCriteria || !meals || !weeks) return null;
  return { version: 2, items, settings: { soonDays, starCriteria }, meals, weeks };
};

/**
 * Reads a stored document. Version 1 is upgraded in memory; the caller persists it.
 * Returns null for unreadable data so the caller can keep the original bytes.
 */
export const parseStored = (value: unknown): { data: IAppData; migrated: boolean } | null => {
  if (!isRecord(value)) return null;
  if (value.version === 1) {
    const items = parseItems(value.items);
    const soonDays = parseSoonDays(value.settings);
    if (!items || soonDays === null) return null;
    return { data: migrateV1(items, soonDays), migrated: true };
  }
  if (value.version === 2) {
    const data = parseV2(value);
    if (!data) return null;
    return { data, migrated: false };
  }
  return null;
};

export const parseAppData = (value: unknown): IAppData | null => parseStored(value)?.data ?? null;
