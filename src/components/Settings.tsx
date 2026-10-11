import type { TargetedEvent } from 'preact';
import { useState } from 'preact/hooks';
import { backupFileName, exportJson, importJson } from '../domain/backup';
import { todayIso } from '../domain/expiry';
import { MAX_SOON_DAYS, type IAppData } from '../domain/model';
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

const plural = (n: number): string => `${n} ${n === 1 ? 'item' : 'items'}`;

const isStandalone = (): boolean =>
  (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const Settings = ({ data, dispatch }: ISettingsProps) => {
  const [message, setMessage] = useState<TMessage>(null);

  const onSoonDays = (event: TargetedEvent<HTMLSelectElement>) => {
    dispatch({ type: 'setSoonDays', soonDays: Number(event.currentTarget.value) });
  };

  const onExport = async () => {
    const file = new File([exportJson(data)], backupFileName(todayIso()), { type: 'application/json' });
    await saveFile(file);
  };

  const onImport = async (event: TargetedEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const imported = importJson(await file.text());
      const ok = window.confirm(
        `Replace everything in the fridge with ${plural(imported.items.length)} from this backup?`,
      );
      if (!ok) return;
      dispatch({ type: 'replaceAll', data: imported });
      setMessage({ kind: 'info', text: `Imported ${plural(imported.items.length)}.` });
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
          <p class="hint">Open this page in Safari, tap Share, then Add to Home Screen.</p>
        </section>
      )}
    </div>
  );
};
