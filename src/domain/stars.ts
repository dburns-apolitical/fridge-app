import { WEEKDAYS, type ICriterion, type IStarWeek, type TWeekday } from './model';

export const starKey = (criterionId: string, day: TWeekday): string => `${criterionId}:${day}`;

export const weekScore = (week: IStarWeek): { earned: number; possible: number } => {
  const ids = new Set(week.criteria.map((criterion) => criterion.id));
  let earned = 0;
  for (const key of Object.keys(week.stars)) {
    const day = key.slice(key.lastIndexOf(':') + 1);
    const id = key.slice(0, key.lastIndexOf(':'));
    if (week.stars[key] && ids.has(id) && (WEEKDAYS as readonly string[]).includes(day)) earned += 1;
  }
  return { earned, possible: week.criteria.length * WEEKDAYS.length };
};

/** Active rows follow `order`; rows that are not in `order` stay where they are. */
export const applyCriterionOrder = (rows: readonly ICriterion[], order: readonly ICriterion[]): ICriterion[] => {
  const active = new Set(order.map((criterion) => criterion.id));
  const queue = order.filter((criterion) => rows.some((row) => row.id === criterion.id));
  let next = 0;
  return rows.map((row) => {
    if (!active.has(row.id)) return row;
    const replacement = queue[next];
    next += 1;
    return replacement ?? row;
  });
};
