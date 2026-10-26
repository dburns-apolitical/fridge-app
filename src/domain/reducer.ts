import {
  MAX_CRITERIA,
  MAX_CRITERION_LABEL,
  MAX_MEAL_LENGTH,
  WEEKDAYS,
  type IAppData,
  type ICriterion,
  type IItem,
  type IItemFields,
  type IStarWeek,
  type TCompartmentId,
  type TWeekday,
} from './model';
import { applyCriterionOrder, starKey } from './stars';
import { clampSoonDays } from './validate';

export type TAction =
  | { type: 'add'; item: IItem }
  | { type: 'update'; id: string; fields: IItemFields }
  | { type: 'remove'; id: string }
  | { type: 'setSoonDays'; soonDays: number }
  | { type: 'setMeal'; day: TWeekday; text: string }
  | { type: 'toggleStar'; weekIndex: number; criterionId: string; day: TWeekday }
  | { type: 'addCriterion'; label: string }
  | { type: 'renameCriterion'; id: string; label: string }
  | { type: 'removeCriterion'; id: string }
  | { type: 'moveCriterion'; id: string; direction: 'up' | 'down' }
  | { type: 'newWeek' }
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

const cleanLabel = (label: string): string => label.trim().slice(0, MAX_CRITERION_LABEL);

const latestIndex = (data: IAppData): number => data.weeks.length - 1;

const withLatestWeek = (data: IAppData, week: IStarWeek): IAppData => ({
  ...data,
  weeks: data.weeks.map((existing, index) => (index === latestIndex(data) ? week : existing)),
});

const withCriteria = (data: IAppData, starCriteria: ICriterion[], week?: IStarWeek): IAppData => {
  const next = { ...data, settings: { ...data.settings, starCriteria } };
  return week ? withLatestWeek(next, week) : next;
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

const weekHasStar = (week: IStarWeek, criterionId: string): boolean =>
  WEEKDAYS.some((day) => week.stars[starKey(criterionId, day)] === true);

const withoutStars = (week: IStarWeek, criterionId: string): IStarWeek['stars'] => {
  const stars = { ...week.stars };
  for (const day of WEEKDAYS) delete stars[starKey(criterionId, day)];
  return stars;
};

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
    case 'setMeal':
      return { ...data, meals: { ...data.meals, [action.day]: action.text.slice(0, MAX_MEAL_LENGTH) } };
    case 'toggleStar': {
      const week = data.weeks[action.weekIndex];
      if (!week || !week.criteria.some((criterion) => criterion.id === action.criterionId)) return data;
      const key = starKey(action.criterionId, action.day);
      const stars = { ...week.stars };
      if (stars[key]) delete stars[key];
      else stars[key] = true;
      return {
        ...data,
        weeks: data.weeks.map((existing, index) => (index === action.weekIndex ? { ...existing, stars } : existing)),
      };
    }
    case 'addCriterion': {
      const label = cleanLabel(action.label);
      if (!label || data.settings.starCriteria.length >= MAX_CRITERIA) return data;
      const criterion = { id: newId(), label };
      const latest = data.weeks[latestIndex(data)];
      return withCriteria(
        data,
        [...data.settings.starCriteria, criterion],
        latest ? { ...latest, criteria: [...latest.criteria, criterion] } : latest,
      );
    }
    case 'renameCriterion': {
      const label = action.label.slice(0, MAX_CRITERION_LABEL);
      if (label.trim() === '') return data;
      const starCriteria = data.settings.starCriteria.map((criterion) =>
        criterion.id === action.id ? { ...criterion, label } : criterion,
      );
      if (starCriteria.every((criterion, index) => criterion === data.settings.starCriteria[index])) return data;
      const latest = data.weeks[latestIndex(data)];
      const week = latest
        ? {
            ...latest,
            criteria: latest.criteria.map((criterion) =>
              criterion.id === action.id ? { ...criterion, label } : criterion,
            ),
          }
        : latest;
      return withCriteria(data, starCriteria, week);
    }
    case 'removeCriterion': {
      // Drop it from the live list, which is what the next week copies. Older weeks are
      // never edited. The current week keeps the row when it already has stars, so that
      // week's earned/possible total stays the same. A row with no stars is removed
      // from the current week only.
      if (!data.settings.starCriteria.some((criterion) => criterion.id === action.id)) return data;
      const starCriteria = data.settings.starCriteria.filter((criterion) => criterion.id !== action.id);
      const latest = data.weeks[latestIndex(data)];
      if (!latest || !latest.criteria.some((criterion) => criterion.id === action.id)) {
        return withCriteria(data, starCriteria);
      }
      if (weekHasStar(latest, action.id)) return withCriteria(data, starCriteria);
      return withCriteria(data, starCriteria, {
        criteria: latest.criteria.filter((criterion) => criterion.id !== action.id),
        stars: withoutStars(latest, action.id),
      });
    }
    case 'moveCriterion': {
      const index = data.settings.starCriteria.findIndex((criterion) => criterion.id === action.id);
      const target = index + (action.direction === 'up' ? -1 : 1);
      if (index < 0 || target < 0 || target >= data.settings.starCriteria.length) return data;
      const starCriteria = data.settings.starCriteria.slice();
      const [moved] = starCriteria.splice(index, 1);
      starCriteria.splice(target, 0, moved);
      const latest = data.weeks[latestIndex(data)];
      const week = latest ? { ...latest, criteria: applyCriterionOrder(latest.criteria, starCriteria) } : latest;
      return withCriteria(data, starCriteria, week);
    }
    case 'newWeek':
      return {
        ...data,
        weeks: [
          ...data.weeks,
          { criteria: data.settings.starCriteria.map((criterion) => ({ ...criterion })), stars: {} },
        ],
      };
    case 'replaceAll':
      return action.data;
  }
};
