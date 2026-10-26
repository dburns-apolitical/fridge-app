import { useEffect, useRef, useState } from 'preact/hooks';
import { COMPARTMENTS, type ICompartment } from '../domain/compartments';
import type { IItem, TCompartmentId, TSection } from '../domain/model';
import { Cabinet, CompartmentButton } from './Cabinet';

interface IFridgeProps {
  items: IItem[];
  alertCount: number;
  doorGeneration?: number;
  onOpenCompartment: (id: TCompartmentId) => void;
}

export const Fridge = ({ items, alertCount, doorGeneration = 0, onOpenCompartment }: IFridgeProps) => {
  const [open, setOpen] = useState<Record<'fridge' | 'freezer', boolean>>({ fridge: false, freezer: false });
  const seenGeneration = useRef(doorGeneration);
  useEffect(() => {
    if (seenGeneration.current === doorGeneration) return;
    seenGeneration.current = doorGeneration;
    setOpen((current) => (current.fridge || current.freezer ? { fridge: false, freezer: false } : current));
  }, [doorGeneration]);
  const toggle = (section: 'fridge' | 'freezer') => setOpen((current) => ({ ...current, [section]: !current[section] }));
  const countIn = (id: TCompartmentId) => items.filter((item) => item.compartment === id).length;
  const button = (compartment: ICompartment) => (
    <CompartmentButton
      key={compartment.id}
      compartment={compartment}
      count={countIn(compartment.id)}
      onOpen={onOpenCompartment}
    />
  );

  const inSection = (section: TSection, kind: ICompartment['kind']) =>
    COMPARTMENTS.filter((compartment) => compartment.section === section && compartment.kind === kind);

  return (
    <div class="fridge">
      <h1 class="page-title">What's in the fridge?</h1>
      <Cabinet section="fridge" open={open.fridge} alertCount={alertCount} onToggle={() => toggle('fridge')}>
        <div class="fridge__shelves">{inSection('fridge', 'shelf').map(button)}</div>
        {inSection('fridge', 'door').map(button)}
      </Cabinet>
      <Cabinet section="freezer" open={open.freezer} alertCount={0} onToggle={() => toggle('freezer')}>
        {inSection('freezer', 'drawer').map(button)}
      </Cabinet>
      <div class="fridge__feet" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
};
