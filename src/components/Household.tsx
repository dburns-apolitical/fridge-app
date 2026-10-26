import { useState } from 'preact/hooks';
import type { IAppData, TCompartmentId, TWeekday } from '../domain/model';
import type { TAction } from '../domain/reducer';
import { Cupboard } from './Cupboard';
import { MealPlanner } from './MealPlanner';
import { Modal } from './Modal';
import { StarChart } from './StarChart';

interface IHouseholdProps {
  data: IAppData;
  dispatch: (action: TAction) => void;
  doorGeneration: number;
  onOpenCompartment: (id: TCompartmentId) => void;
}

type TModal = 'stars' | 'meals' | null;

export const Household = ({ data, dispatch, doorGeneration, onOpenCompartment }: IHouseholdProps) => {
  const [modal, setModal] = useState<TModal>(null);
  const close = () => setModal(null);

  return (
    <div class="household">
      <section class="notice" aria-labelledby="notice-title">
        <h1 id="notice-title" class="page-title">
          Notice board
        </h1>
        <div class="pins">
          <button type="button" class="pin pin--stars" onClick={() => setModal('stars')}>
            Star chart
          </button>
          <button type="button" class="pin pin--meals" onClick={() => setModal('meals')}>
            Meal planner
          </button>
        </div>
      </section>

      <Cupboard items={data.items} doorGeneration={doorGeneration} onOpenCompartment={onOpenCompartment} />

      {modal === 'stars' && (
        <Modal title="Star chart" onClose={close}>
          <StarChart
            weeks={data.weeks}
            liveCriteria={data.settings.starCriteria}
            onToggle={(weekIndex, criterionId, day) => dispatch({ type: 'toggleStar', weekIndex, criterionId, day })}
            onNewWeek={() => dispatch({ type: 'newWeek' })}
          />
        </Modal>
      )}
      {modal === 'meals' && (
        <Modal title="Meal planner" onClose={close}>
          <MealPlanner
            meals={data.meals}
            onChange={(day: TWeekday, text: string) => dispatch({ type: 'setMeal', day, text })}
          />
        </Modal>
      )}
    </div>
  );
};
