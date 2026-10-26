import { useEffect, useRef, useState } from 'preact/hooks';
import { COMPARTMENTS } from '../domain/compartments';
import type { IItem, TCompartmentId } from '../domain/model';
import { Cabinet, CompartmentButton } from './Cabinet';

interface ICupboardProps {
  items: IItem[];
  doorGeneration?: number;
  onOpenCompartment: (id: TCompartmentId) => void;
}

export const Cupboard = ({ items, doorGeneration = 0, onOpenCompartment }: ICupboardProps) => {
  const [open, setOpen] = useState(false);
  const seenGeneration = useRef(doorGeneration);
  useEffect(() => {
    if (seenGeneration.current === doorGeneration) return;
    seenGeneration.current = doorGeneration;
    setOpen((current) => (current ? false : current));
  }, [doorGeneration]);
  const shelves = COMPARTMENTS.filter((compartment) => compartment.section === 'cupboard');

  return (
    <div class="cupboard">
      <h2 class="household__label">Cupboard</h2>
      <Cabinet section="cupboard" open={open} alertCount={0} onToggle={() => setOpen((current) => !current)}>
        <div class="cabinet__stack">
          {shelves.map((compartment) => (
            <CompartmentButton
              key={compartment.id}
              compartment={compartment}
              count={items.filter((item) => item.compartment === compartment.id).length}
              onOpen={onOpenCompartment}
            />
          ))}
        </div>
      </Cabinet>
    </div>
  );
};
