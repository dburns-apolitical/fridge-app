import { useRef, useState } from 'preact/hooks';
import type { IAppData, TCompartmentId } from '../domain/model';
import type { TAction } from '../domain/reducer';
import { Fridge } from './Fridge';
import { Household } from './Household';

interface IHomePagerProps {
  data: IAppData;
  alertCount: number;
  dispatch: (action: TAction) => void;
  onOpenCompartment: (id: TCompartmentId) => void;
}

export const HomePager = ({ data, alertCount, dispatch, onOpenCompartment }: IHomePagerProps) => {
  const [page, setPage] = useState(0);
  const [doorGeneration, setDoorGeneration] = useState(0);
  const pageRef = useRef(0);
  const start = useRef<{ x: number; y: number } | null>(null);

  const goTo = (next: number) => {
    if (pageRef.current === next) return;
    pageRef.current = next;
    setPage(next);
    setDoorGeneration((current) => current + 1);
  };

  const onPointerDown = (event: globalThis.PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: globalThis.PointerEvent) => {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    start.current = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    goTo(dx < 0 ? Math.min(1, pageRef.current + 1) : Math.max(0, pageRef.current - 1));
  };

  return (
    <div class="pager">
      <div
        class="pager__viewport"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null;
        }}
      >
      <div class="pager__track" style={{ transform: `translateX(${page === 0 ? '0' : '-100%'})` }}>
        <section class="pager__page" aria-hidden={page !== 0} inert={page !== 0}>
          <Fridge
            items={data.items}
            alertCount={alertCount}
            doorGeneration={doorGeneration}
            onOpenCompartment={onOpenCompartment}
          />
        </section>
        <section class="pager__page" aria-label="Household" aria-hidden={page !== 1} inert={page !== 1}>
          <Household
            data={data}
            dispatch={dispatch}
            doorGeneration={doorGeneration}
            onOpenCompartment={onOpenCompartment}
          />
        </section>
      </div>
      </div>

      {page === 0 && (
        <button type="button" class="pager__edge pager__edge--next" aria-label="Open the notice board" onClick={() => goTo(1)}>
          <span aria-hidden="true">›</span>
        </button>
      )}
      {page === 1 && (
        <button type="button" class="pager__edge pager__edge--back" aria-label="Back to the fridge" onClick={() => goTo(0)}>
          <span aria-hidden="true">‹</span>
        </button>
      )}
    </div>
  );
};
