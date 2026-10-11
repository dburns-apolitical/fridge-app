import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { COMPARTMENTS, type ICompartment } from '../domain/compartments';
import type { IItem, TCompartmentId, TSection } from '../domain/model';

interface IFridgeProps {
  items: IItem[];
  alertCount: number;
  onOpenCompartment: (id: TCompartmentId) => void;
}

const SECTION_NAMES: Record<TSection, string> = { fridge: 'fridge', freezer: 'freezer' };

const DoorFace = ({ sleepy }: { sleepy: boolean }) => (
  <svg class="face" viewBox="0 0 120 80" aria-hidden="true">
    {sleepy ? (
      <>
        <path d="M32 34 q10 -10 20 0" />
        <path d="M68 34 q10 -10 20 0" />
      </>
    ) : (
      <>
        <circle cx="42" cy="30" r="7" class="face__eye" />
        <circle cx="78" cy="30" r="7" class="face__eye" />
        <circle cx="44" cy="27" r="2.2" class="face__shine" />
        <circle cx="80" cy="27" r="2.2" class="face__shine" />
      </>
    )}
    <ellipse cx="28" cy="46" rx="9" ry="5" class="face__cheek" />
    <ellipse cx="92" cy="46" rx="9" ry="5" class="face__cheek" />
    <path d="M50 46 q10 12 20 0" />
  </svg>
);

interface ICabinetProps {
  section: TSection;
  open: boolean;
  alertCount: number;
  onToggle: () => void;
  children: ComponentChildren;
}

const Cabinet = ({ section, open, alertCount, onToggle, children }: ICabinetProps) => {
  const name = SECTION_NAMES[section];
  const alert = alertCount > 0 ? `, ${alertCount} to use soon` : '';
  return (
    <section class={`cabinet cabinet--${section}${open ? ' cabinet--open' : ''}`}>
      {open && <div class="cabinet__interior">{children}</div>}
      <button
        type="button"
        class="cabinet__door"
        aria-expanded={open}
        aria-label={open ? `Close the ${name}` : `Open the ${name}${alert}`}
        onClick={onToggle}
      >
        <DoorFace sleepy={section === 'freezer'} />
        {alertCount > 0 && (
          <span class="cabinet__badge" aria-hidden="true">
            {alertCount}
          </span>
        )}
      </button>
    </section>
  );
};

interface ICompartmentButtonProps {
  compartment: ICompartment;
  count: number;
  onOpen: (id: TCompartmentId) => void;
}

const CompartmentButton = ({ compartment, count, onOpen }: ICompartmentButtonProps) => (
  <button
    type="button"
    class={`compartment compartment--${compartment.kind}`}
    aria-label={`${compartment.name}, ${count} ${count === 1 ? 'item' : 'items'}`}
    onClick={() => onOpen(compartment.id)}
  >
    <span class="compartment__name">{compartment.name}</span>
    <span class="compartment__count">{count}</span>
  </button>
);

export const Fridge = ({ items, alertCount, onOpenCompartment }: IFridgeProps) => {
  const [open, setOpen] = useState<Record<TSection, boolean>>({ fridge: false, freezer: false });
  const toggle = (section: TSection) => setOpen((o) => ({ ...o, [section]: !o[section] }));
  const countIn = (id: TCompartmentId) => items.filter((i) => i.compartment === id).length;
  const button = (c: ICompartment) => (
    <CompartmentButton key={c.id} compartment={c} count={countIn(c.id)} onOpen={onOpenCompartment} />
  );

  const shelves = COMPARTMENTS.filter((c) => c.kind === 'shelf');
  const door = COMPARTMENTS.filter((c) => c.kind === 'door');
  const drawers = COMPARTMENTS.filter((c) => c.kind === 'drawer');

  return (
    <div class="fridge">
      <h1 class="page-title">What's in the fridge?</h1>
      <Cabinet section="fridge" open={open.fridge} alertCount={alertCount} onToggle={() => toggle('fridge')}>
        <div class="fridge__shelves">{shelves.map(button)}</div>
        {door.map(button)}
      </Cabinet>
      <Cabinet section="freezer" open={open.freezer} alertCount={0} onToggle={() => toggle('freezer')}>
        {drawers.map(button)}
      </Cabinet>
      <div class="fridge__feet" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
};
