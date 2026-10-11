import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { addDays, todayIso } from '../domain/expiry';
import type { IItem } from '../domain/model';
import { CompartmentSheet } from './CompartmentSheet';

const today = todayIso();
const tomorrow = addDays(today, 1);

const ham: IItem = {
  id: 'ham',
  name: 'Ham',
  quantity: '4 slices',
  expiry: tomorrow,
  compartment: 'fridge-shelf-1',
  addedAt: '2026-10-11T08:00:00.000Z',
};

const renderSheet = (items: IItem[] = []) => {
  const dispatch = vi.fn();
  const onClose = vi.fn();
  render(
    <CompartmentSheet
      compartmentId="fridge-shelf-1"
      items={items}
      today={today}
      soonDays={3}
      dispatch={dispatch}
      onClose={onClose}
    />,
  );
  return { dispatch, onClose };
};

describe('CompartmentSheet', () => {
  it('is a dialog named after the compartment, with an empty state', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: 'Top shelf' })).toBeTruthy();
    expect(screen.getByText('Nothing here yet.')).toBeTruthy();
  });

  it('lists items with quantity and expiry', () => {
    renderSheet([ham]);
    expect(screen.getByText('Ham')).toBeTruthy();
    expect(screen.getByText('4 slices')).toBeTruthy();
    expect(screen.getByText('Expires tomorrow').className).toContain('chip--soon');
  });

  it('adds an item to this compartment', () => {
    const { dispatch } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.input(screen.getByLabelText('Name'), { target: { value: ' Milk ' } });
    fireEvent.input(screen.getByLabelText(/Quantity/), { target: { value: '2 pints' } });
    fireEvent.change(screen.getByLabelText(/Expiry date/), { target: { value: tomorrow } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'add',
      item: expect.objectContaining({
        name: 'Milk',
        quantity: '2 pints',
        expiry: tomorrow,
        compartment: 'fridge-shelf-1',
      }),
    });
    expect(screen.getByRole('button', { name: 'Add item' })).toBeTruthy();
  });

  it('will not add an item whose name is only spaces', () => {
    const { dispatch } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.input(screen.getByLabelText('Name'), { target: { value: '   ' } });
    const add = screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.click(add);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('cancels adding without dispatching', () => {
    const { dispatch } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeTruthy();
  });

  it('edits an item with its current values filled in', () => {
    const { dispatch } = renderSheet([ham]);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Ham' }));
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ham');
    expect((screen.getByLabelText(/Expiry date/) as HTMLInputElement).value).toBe(tomorrow);

    fireEvent.click(screen.getByRole('button', { name: 'Clear date' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'update',
      id: 'ham',
      fields: { name: 'Ham', quantity: '4 slices', expiry: '' },
    });
  });

  it('removes an item', () => {
    const { dispatch } = renderSheet([ham]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ham' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'remove', id: 'ham' });
  });

  it('closes with the close button, Escape or a backdrop tap', () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not close when tapping inside the sheet', () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
