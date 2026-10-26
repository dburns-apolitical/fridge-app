import type { TCompartmentId, TCompartmentKind, TSection } from './model';

export interface ICompartment {
  id: TCompartmentId;
  name: string;
  section: TSection;
  kind: TCompartmentKind;
}

export const COMPARTMENTS: readonly ICompartment[] = [
  { id: 'fridge-shelf-1', name: 'Top shelf', section: 'fridge', kind: 'shelf' },
  { id: 'fridge-shelf-2', name: 'Middle shelf', section: 'fridge', kind: 'shelf' },
  { id: 'fridge-shelf-3', name: 'Bottom shelf', section: 'fridge', kind: 'shelf' },
  { id: 'fridge-door', name: 'Door', section: 'fridge', kind: 'door' },
  { id: 'freezer-drawer-1', name: 'Top drawer', section: 'freezer', kind: 'drawer' },
  { id: 'freezer-drawer-2', name: 'Middle drawer', section: 'freezer', kind: 'drawer' },
  { id: 'freezer-drawer-3', name: 'Bottom drawer', section: 'freezer', kind: 'drawer' },
  { id: 'cupboard-shelf-1', name: 'Top shelf', section: 'cupboard', kind: 'shelf' },
  { id: 'cupboard-shelf-2', name: 'Middle shelf', section: 'cupboard', kind: 'shelf' },
  { id: 'cupboard-shelf-3', name: 'Bottom shelf', section: 'cupboard', kind: 'shelf' },
];

export const isCompartmentId = (value: unknown): value is TCompartmentId =>
  COMPARTMENTS.some((c) => c.id === value);

export const compartmentName = (id: TCompartmentId): string =>
  COMPARTMENTS.find((c) => c.id === id)?.name ?? id;

/** Fridge and freezer names stay short. Cupboard shelves share those names, so qualify them. */
export const compartmentPlace = (id: TCompartmentId): string => {
  const compartment = COMPARTMENTS.find((c) => c.id === id);
  if (!compartment) return id;
  if (compartment.section === 'cupboard') return `Cupboard · ${compartment.name}`;
  return compartment.name;
};
