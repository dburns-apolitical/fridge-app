import { useState } from 'preact/hooks';
import { COMPARTMENTS } from '../domain/compartments';
import type { IItem, TCompartmentId } from '../domain/model';
import { Cabinet, CompartmentButton } from './Cabinet';

interface ICupboardProps {
  items: IItem[];
  onOpenCompartment: (id: TCompartmentId) => void;
}

export const Cupboard = ({ items, onOpenCompartment }: ICupboardProps) => {
  const [open, setOpen] = useState(false);
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
