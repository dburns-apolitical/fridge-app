import type { TargetedEvent } from 'preact';
import { useState } from 'preact/hooks';
import type { IItemFields } from '../domain/model';

interface IItemFormProps {
  initial?: IItemFields;
  submitLabel: string;
  onSubmit: (fields: IItemFields) => void;
  onCancel: () => void;
}

const EMPTY: IItemFields = { name: '', quantity: '', expiry: '' };

export const ItemForm = ({ initial = EMPTY, submitLabel, onSubmit, onCancel }: IItemFormProps) => {
  const [fields, setFields] = useState<IItemFields>(initial);
  const canSave = fields.name.trim() !== '';

  // Read the value before setState: the event's currentTarget is gone by the time an updater runs.
  const update = (key: keyof IItemFields) => (event: TargetedEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setFields((f) => ({ ...f, [key]: value }));
  };

  const submit = (event: Event) => {
    event.preventDefault();
    if (canSave) onSubmit(fields);
  };

  return (
    <form class="item-form" onSubmit={submit}>
      <label>
        Name
        <input value={fields.name} onInput={update('name')} maxLength={80} autoComplete="off" />
      </label>
      <label>
        Quantity <span class="optional">(optional)</span>
        <input
          value={fields.quantity}
          onInput={update('quantity')}
          maxLength={40}
          placeholder="e.g. half a tub"
          autoComplete="off"
        />
      </label>
      <label>
        Expiry date <span class="optional">(optional)</span>
        <input type="date" value={fields.expiry} onInput={update('expiry')} onChange={update('expiry')} />
      </label>
      {fields.expiry && (
        <button type="button" class="link" onClick={() => setFields((f) => ({ ...f, expiry: '' }))}>
          Clear date
        </button>
      )}
      <div class="item-form__actions">
        <button type="button" class="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" class="primary" disabled={!canSave}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
