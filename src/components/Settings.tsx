import type { TargetedEvent } from 'preact';
import { useState } from 'preact/hooks';
import { backupFileName, exportJson, importJson } from '../domain/backup';
import { todayIso } from '../domain/expiry';
import { MAX_CRITERIA, MAX_SOON_DAYS, type IAppData, type ICriterion } from '../domain/model';
import type { TAction } from '../domain/reducer';
import { saveFile } from '../lib/saveFile';

interface ISettingsProps {
  data: IAppData;
  dispatch: (action: TAction) => void;
}

type TMessage = { kind: 'info' | 'error'; text: string } | null;

const DAY_OPTIONS = Array.from({ length: MAX_SOON_DAYS + 1 }, (_, n) => n);

const dayLabel = (n: number): string =>
  n === 0 ? '0 days (today and expired only)' : `${n} ${n === 1 ? 'day' : 'days'}`;

const plural = (n: number, word: string): string => `${n} ${n === 1 ? word : `${word}s`}`;

const CriterionRow = ({
  criterion,
  index,
  count,
  dispatch,
}: {
  criterion: ICriterion;
  index: number;
  count: number;
  dispatch: (action: TAction) => void;
}) => {
  const [label, setLabel] = useState(criterion.label);

  const onInput = (event: TargetedEvent<HTMLInputElement>) => {
    const next = event.currentTarget.value;
    setLabel(next);
    dispatch({ type: 'renameCriterion', id: criterion.id, label: next });
  };

  return (
    <li class="criteria__row">
      <input
        aria-label={`Criterion ${index + 1}`}
        value={label}
        maxLength={40}
        onInput={onInput}
        onBlur={() => {
          const trimmed = label.trim();
          if (trimmed === '') setLabel(criterion.label);
          else if (trimmed !== label) {
            setLabel(trimmed);
            dispatch({ type: 'renameCriterion', id: criterion.id, label: trimmed });
          }
        }}
      />
      <button
        type="button"
        aria-label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => dispatch({ type: 'moveCriterion', id: criterion.id, direction: 'up' })}
      >
        Up
      </button>
      <button
        type="button"
        aria-label={`Move ${label} down`}
        disabled={index === count - 1}
        onClick={() => dispatch({ type: 'moveCriterion', id: criterion.id, direction: 'down' })}
      >
        Down
      </button>
      <button type="button" aria-label={`Remove ${label}`} onClick={() => dispatch({ type: 'removeCriterion', id: criterion.id })}>
        Remove
      </button>
    </li>
  );
};

const isStandalone = (): boolean =>
  (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const Settings = ({ data, dispatch }: ISettingsProps) => {
  const [message, setMessage] = useState<TMessage>(null);
  const [draft, setDraft] = useState('');
  const criteria = data.settings.starCriteria;

  const onSoonDays = (event: TargetedEvent<HTMLSelectElement>) => {
    dispatch({ type: 'setSoonDays', soonDays: Number(event.currentTarget.value) });
  };

  const onExport = async () => {
    setMessage(null);
    try {
      const file = new File([exportJson(data)], backupFileName(todayIso()), { type: 'application/json' });
      await saveFile(file);
    } catch {
      setMessage({ kind: 'error', text: "Couldn't export the backup." });
    }
  };

  const onImport = async (event: TargetedEvent<HTMLInputElement>) => {
    setMessage(null);
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const imported = importJson(await file.text());
      const ok = window.confirm(
        `Replace everything saved on this phone with ${plural(imported.items.length, 'item')} from this backup?`,
      );
      if (!ok) return;
      dispatch({ type: 'replaceAll', data: imported });
      setMessage({ kind: 'info', text: `Imported ${plural(imported.items.length, 'item')}.` });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Import failed.' });
    }
  };

  return (
    <div class="settings">
      <h1 class="page-title">Settings</h1>

      <section class="settings__card">
        <label>
          Warn me this many days before expiry
          <select value={String(data.settings.soonDays)} onChange={onSoonDays}>
            {DAY_OPTIONS.map((n) => (
              <option key={n} value={String(n)}>
                {dayLabel(n)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section class="settings__card">
        <h2>Star chart</h2>
        <p class="hint">
          These rows appear on the current week and on each new week. Removing a row leaves it on weeks where it
          already has stars, so those totals stay the same.
        </p>
        {criteria.length === 0 && <p class="empty">No criteria yet.</p>}
        <ul class="criteria">
          {criteria.map((criterion, index) => (
            <CriterionRow
              key={criterion.id}
              criterion={criterion}
              index={index}
              count={criteria.length}
              dispatch={dispatch}
            />
          ))}
        </ul>
        <form
          class="criteria__add"
          onSubmit={(event) => {
            event.preventDefault();
            dispatch({ type: 'addCriterion', label: draft });
            setDraft('');
          }}
        >
          <input
            aria-label="New criterion"
            value={draft}
            maxLength={40}
            onInput={(event) => setDraft(event.currentTarget.value)}
          />
          <button type="submit" class="secondary" disabled={draft.trim() === '' || criteria.length >= MAX_CRITERIA}>
            Add criterion
          </button>
        </form>
      </section>

      <section class="settings__card">
        <h2>Backup</h2>
        <p class="hint">Everything is saved on this phone only. Export a backup now and then to keep it safe.</p>
        <div class="settings__buttons">
          <button type="button" class="secondary" onClick={onExport}>
            Export backup
          </button>
          <label class="secondary">
            Import backup
            <input type="file" accept="application/json,.json" class="visually-hidden" onChange={onImport} />
          </label>
        </div>
        {message?.kind === 'info' && <p role="status">{message.text}</p>}
        {message?.kind === 'error' && (
          <p role="alert" class="message--error">
            {message.text}
          </p>
        )}
      </section>

      {!isStandalone() && (
        <section class="settings__card">
          <h2>Install</h2>
          <p class="hint">Install this first: in Safari tap Share, then Add to Home Screen. Items added here in Safari won't move across, so if you've already started, export a backup and import it in the installed app.</p>
        </section>
      )}
    </div>
  );
};
