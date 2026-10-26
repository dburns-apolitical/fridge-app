import { compartmentPlace } from '../domain/compartments';
import { expiryStatus } from '../domain/expiry';
import type { IItem, TCompartmentId } from '../domain/model';
import { ExpiryChip } from './ExpiryChip';

interface IUseSoonProps {
  items: IItem[];
  today: string;
  soonDays: number;
  onOpenCompartment: (id: TCompartmentId) => void;
}

const emptyMessage = (soonDays: number): string =>
  soonDays === 0
    ? 'Nothing has expired.'
    : `Nothing expiring in the next ${soonDays} ${soonDays === 1 ? 'day' : 'days'}.`;

export const UseSoon = ({ items, today, soonDays, onOpenCompartment }: IUseSoonProps) => (
  <section class="use-soon" aria-labelledby="use-soon-title">
    <h1 id="use-soon-title" class="page-title">
      Use soon
    </h1>
    {items.length === 0 ? (
      <p class="empty">{emptyMessage(soonDays)}</p>
    ) : (
      <ul class="item-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              class={`soon-row soon-row--${expiryStatus(item, today, soonDays)}`}
              onClick={() => onOpenCompartment(item.compartment)}
            >
              <span class="soon-row__name">{item.name}</span>
              <span class="soon-row__where">{compartmentPlace(item.compartment)}</span>
              <ExpiryChip expiry={item.expiry} today={today} soonDays={soonDays} />
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
