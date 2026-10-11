import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportJson } from '../domain/backup';
import { todayIso } from '../domain/expiry';
import type { IAppData } from '../domain/model';
import { saveFile } from '../lib/saveFile';
import { Settings } from './Settings';

vi.mock('../lib/saveFile', () => ({ saveFile: vi.fn().mockResolvedValue(undefined) }));

const data: IAppData = {
  version: 1,
  items: [{ id: 'm', name: 'Milk', compartment: 'fridge-door', addedAt: '2026-10-11T08:00:00.000Z' }],
  settings: { soonDays: 3 },
};

const backup: IAppData = {
  version: 1,
  items: [{ id: 'p', name: 'Peas', compartment: 'freezer-drawer-1', addedAt: '2026-10-11T08:00:00.000Z' }],
  settings: { soonDays: 5 },
};

const upload = (text: string) => {
  const file = new File([text], 'backup.json', { type: 'application/json' });
  fireEvent.change(screen.getByLabelText('Import backup'), { target: { files: [file] } });
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(saveFile).mockClear();
});

describe('Settings', () => {
  it('changes the number of soon days', () => {
    const dispatch = vi.fn();
    render(<Settings data={data} dispatch={dispatch} />);
    const select = screen.getByLabelText('Warn me this many days before expiry') as HTMLSelectElement;
    expect(select.value).toBe('3');
    expect(select.options).toHaveLength(31);
    expect(select.options[0].textContent).toBe('0 days (today and expired only)');
    fireEvent.change(select, { target: { value: '7' } });
    expect(dispatch).toHaveBeenCalledWith({ type: 'setSoonDays', soonDays: 7 });
  });

  it('exports a dated backup file', async () => {
    render(<Settings data={data} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }));
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    const file = vi.mocked(saveFile).mock.calls[0][0];
    expect(file.name).toBe(`fridge-backup-${todayIso()}.json`);
    expect(await file.text()).toBe(exportJson(data));
  });

  it('imports a valid backup after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const dispatch = vi.fn();
    render(<Settings data={data} dispatch={dispatch} />);
    upload(exportJson(backup));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'replaceAll', data: backup }));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Imported 1 item.');
  });

  it('leaves data alone when the import is not confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const dispatch = vi.fn();
    render(<Settings data={data} dispatch={dispatch} />);
    upload(exportJson(backup));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('shows an error and leaves data alone for a bad file', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const dispatch = vi.fn();
    render(<Settings data={data} dispatch={dispatch} />);
    upload('{"version":1,"items":[{"id":"x","name":"Ham","compartment":"garage","addedAt":"x"}],"settings":{"soonDays":3}}');
    expect((await screen.findByRole('alert')).textContent).toBe("That file isn't a fridge backup.");
    expect(confirm).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('explains how to install when not running from the home screen', () => {
    render(<Settings data={data} dispatch={vi.fn()} />);
    expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
    expect(screen.getByText(/won't move across/)).toBeTruthy();
  });

  it('shows an error when the backup cannot be saved', async () => {
    vi.mocked(saveFile).mockRejectedValueOnce(new Error('denied'));
    render(<Settings data={data} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }));
    expect((await screen.findByRole('alert')).textContent).toBe("Couldn't export the backup.");
  });
});
