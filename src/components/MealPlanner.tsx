import type { TargetedEvent } from 'preact';
import { WEEKDAYS, WEEKDAY_NAME, type TMeals, type TWeekday } from '../domain/model';

interface IMealPlannerProps {
  meals: TMeals;
  onChange: (day: TWeekday, text: string) => void;
}

export const MealPlanner = ({ meals, onChange }: IMealPlannerProps) => {
  const onInput = (day: TWeekday) => (event: TargetedEvent<HTMLInputElement>) => {
    onChange(day, event.currentTarget.value);
  };

  return (
    <form class="meals" onSubmit={(event) => event.preventDefault()}>
      <p class="hint">One meal for each day. Saved on this phone only.</p>
      {WEEKDAYS.map((day) => (
        <label key={day}>
          {WEEKDAY_NAME[day]}
          <input value={meals[day]} onInput={onInput(day)} maxLength={120} autoComplete="off" />
        </label>
      ))}
    </form>
  );
};
