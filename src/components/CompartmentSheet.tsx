import { useEffect, useState } from 'preact/hooks';
import { compartmentName } from '../domain/compartments';
import { sortItems } from '../domain/expiry';
import type { IItem, TCompartmentId } from '../domain/model';
import { createItem, toFields, type TAction } from '../domain/reducer';
import { ExpiryChip } from './ExpiryChip';
import { ItemForm } from './ItemForm';

interface ICompartmentSheetProps {
  compartmentId: TCompartmentId;
  items: IItem[];
  today: string;
  soonDays: number;
  dispatch: (action: TAction) => void;
  onClose: () => void;
}

type TMode = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; item: IItem };

export const CompartmentSheet = ({ compartmentId, items, today, soonDays, dispatch, onClose }: ICompartmentSheetProps) => {
  const [mode, setMode] = useState<TMode>({ kind: 'list' });
  const backToList = () => setMode({ kind: 'list' });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sorted = sortItems(items);

  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header class="sheet__header">
          <h2 id="sheet-title">{compartmentName(compartmentId)}</h2>
          <button type="button" class="icon-button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        {mode.kind === 'list' && (
          <>
            {sorted.length === 0 ? (
              <p class="empty">Nothing here yet.</p>
            ) : (
              <ul class="item-list">
                {sorted.map((item) => (
                  <li key={item.id} class="item-row">
                    <div class="item-row__text">
                      <span class="item-row__name">{item.name}</span>
                      {item.quantity && <span class="item-row__qty">{item.quantity}</span>}
                      <ExpiryChip expiry={item.expiry} today={today} soonDays={soonDays} />
                    </div>
                    <div class="item-row__actions">
                      <button type="button" aria-label={`Edit ${item.name}`} onClick={() => setMode({ kind: 'edit', item })}>
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => dispatch({ type: 'remove', id: item.id })}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" class="primary" onClick={() => setMode({ kind: 'add' })}>
              Add item
            </button>
          </>
        )}

        {mode.kind === 'add' && (
          <ItemForm
            submitLabel="Add"
            onCancel={backToList}
            onSubmit={(fields) => {
              dispatch({ type: 'add', item: createItem(fields, compartmentId) });
              backToList();
            }}
          />
        )}

        {mode.kind === 'edit' && (
          <ItemForm
            initial={toFields(mode.item)}
            submitLabel="Save"
            onCancel={backToList}
            onSubmit={(fields) => {
              dispatch({ type: 'update', id: mode.item.id, fields });
              backToList();
            }}
          />
        )}
      </div>
    </div>
  );
};
