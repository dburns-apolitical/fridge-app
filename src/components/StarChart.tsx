import { useEffect, useState } from 'preact/hooks';
import { weekScore } from '../domain/stars';
import {
  WEEKDAYS,
  WEEKDAY_INITIAL,
  WEEKDAY_NAME,
  type ICriterion,
  type IStarWeek,
  type TWeekday,
} from '../domain/model';

interface IStarChartProps {
  weeks: readonly IStarWeek[];
  liveCriteria: readonly ICriterion[];
  onToggle: (weekIndex: number, criterionId: string, day: TWeekday) => void;
  onNewWeek: () => void;
}

export const StarChart = ({ weeks, liveCriteria, onToggle, onNewWeek }: IStarChartProps) => {
  const [index, setIndex] = useState(() => Math.max(0, weeks.length - 1));

  useEffect(() => {
    setIndex(Math.max(0, weeks.length - 1));
  }, [weeks.length]);

  const week = weeks[index];
  if (!week) return null;

  const { earned, possible } = weekScore(week);
  const liveIds = new Set(liveCriteria.map((criterion) => criterion.id));
  const kept = week.criteria.filter((criterion) => !liveIds.has(criterion.id));
  const atEnd = index === weeks.length - 1;

  return (
    <div class="star-chart">
      <div class="star-chart__nav">
        <button type="button" aria-label="Previous week" disabled={index === 0} onClick={() => setIndex((current) => current - 1)}>
          ‹
        </button>
        <div class="star-chart__title">
          <h3>Week {index + 1}</h3>
          <p class="star-chart__score" aria-label={`${earned} of ${possible} stars`}>
            {earned}/{possible}
          </p>
        </div>
        <button
          type="button"
          aria-label="Next week"
          disabled={atEnd}
          onClick={() => setIndex((current) => current + 1)}
        >
          ›
        </button>
      </div>

      {week.criteria.length === 0 ? (
        <p class="empty">Add criteria in Settings. Each one becomes a row you can star.</p>
      ) : (
        <div class="star-scroll">
          <table class="star-table">
            <thead>
              <tr>
                <th scope="col">Criterion</th>
                {WEEKDAYS.map((day) => (
                  <th key={day} scope="col">
                    <abbr title={WEEKDAY_NAME[day]}>{WEEKDAY_INITIAL[day]}</abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {week.criteria.map((criterion) => {
                const retired = !liveIds.has(criterion.id);
                return (
                  <tr key={criterion.id}>
                    <th scope="row">
                      {criterion.label}
                      {retired && <span class="star-kept"> kept</span>}
                    </th>
                    {WEEKDAYS.map((day) => {
                      const starred = week.stars[`${criterion.id}:${day}`] === true;
                      return (
                        <td key={day}>
                          <button
                            type="button"
                            class={`star-cell${starred ? ' star-cell--on' : ''}`}
                            aria-pressed={starred}
                            aria-label={`${WEEKDAY_NAME[day]}, ${criterion.label}, ${starred ? 'starred' : 'not starred'}`}
                            onClick={() => onToggle(index, criterion.id, day)}
                          >
                            <span aria-hidden="true">{starred ? '★' : '☆'}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {kept.length > 0 && (
        <p class="hint">Kept rows stay so this week's total does not change. They are left off new weeks.</p>
      )}

      {atEnd && (
        <button type="button" class="secondary star-chart__new" onClick={onNewWeek}>
          New week
        </button>
      )}
    </div>
  );
};
