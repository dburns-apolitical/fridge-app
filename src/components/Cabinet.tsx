import type { ComponentChildren } from 'preact';
import type { ICompartment } from '../domain/compartments';
import type { TCompartmentId, TSection } from '../domain/model';

const SECTION_NAMES: Record<TSection, string> = {
  fridge: 'fridge',
  freezer: 'freezer',
  cupboard: 'cupboard',
};

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

export const Cabinet = ({ section, open, alertCount, onToggle, children }: ICabinetProps) => {
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

export const CompartmentButton = ({ compartment, count, onOpen }: ICompartmentButtonProps) => (
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
