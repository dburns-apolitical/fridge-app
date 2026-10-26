import { fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { addDays, todayIso } from './domain/expiry';
import { STORAGE_KEY } from './domain/storage';

const tomorrow = addDays(todayIso(), 1);

const addMilkToTopShelf = () => {
  fireEvent.click(screen.getByRole('button', { name: /Open the fridge/ }));
  fireEvent.click(screen.getByRole('button', { name: /Top shelf/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
  fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Milk' } });
  fireEvent.change(screen.getByLabelText(/Expiry date/), { target: { value: tomorrow } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
};

afterEach(() => vi.restoreAllMocks());

describe('App', () => {
  it('starts on the fridge view', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: "What's in the fridge?" })).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('button', { name: 'Fridge' }).getAttribute('aria-current')).toBe('page');
  });

  it('adds an item, saves it and lists it under Use soon', () => {
    render(<App />);
    addMilkToTopShelf();

    expect(within(screen.getByRole('dialog')).getByText('Milk')).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"Milk"');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Use soon/ }));
    expect(screen.getByRole('heading', { name: 'Use soon' })).toBeTruthy();
    expect(screen.getByText('Expires tomorrow')).toBeTruthy();
  });

  it('shows the use soon count on the tab and the fridge door', () => {
    render(<App />);
    addMilkToTopShelf();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close the fridge' }));

    expect(screen.getByRole('button', { name: 'Use soon 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open the fridge, 1 to use soon' })).toBeTruthy();
  });

  it('opens the right compartment from Use soon', () => {
    render(<App />);
    addMilkToTopShelf();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: /Use soon/ }));
    fireEvent.click(screen.getByRole('button', { name: /Milk/ }));
    expect(screen.getByRole('dialog', { name: 'Top shelf' })).toBeTruthy();
  });

  it('loads items saved earlier', () => {
    const first = render(<App />);
    addMilkToTopShelf();
    first.unmount();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open the fridge/ }));
    expect(screen.getByRole('button', { name: 'Top shelf, 1 item' })).toBeTruthy();
  });

  it('loads a version 1 save without dropping the item', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        items: [{ id: 'm', name: 'Milk', compartment: 'fridge-shelf-1', addedAt: '2026-10-11T08:00:00.000Z' }],
        settings: { soonDays: 3 },
      }),
    );
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open the fridge/ }));
    expect(screen.getByRole('button', { name: 'Top shelf, 1 item' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(2);
  });

  it('keeps earlier star weeks when a criterion is removed', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.input(screen.getByLabelText('New criterion'), { target: { value: 'Teeth' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add criterion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fridge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open the notice board' }));
    fireEvent.click(screen.getByRole('button', { name: 'Star chart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Monday, Teeth, not starred' }));
    expect(screen.getByLabelText('1 of 7 stars').textContent).toBe('1/7');

    fireEvent.click(screen.getByRole('button', { name: 'New week' }));
    expect(screen.getByRole('heading', { name: 'Week 2' })).toBeTruthy();
    expect(screen.getByLabelText('0 of 7 stars').textContent).toBe('0/7');
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByLabelText('1 of 7 stars').textContent).toBe('1/7');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to the fridge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Teeth' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fridge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open the notice board' }));
    fireEvent.click(screen.getByRole('button', { name: 'Star chart' }));
    expect(screen.getByText('Add criteria in Settings. Each one becomes a row you can star.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByLabelText('1 of 7 stars').textContent).toBe('1/7');
    expect(screen.getByText('kept')).toBeTruthy();
  });

  it('saves a meal and a cupboard item that shows up in Use soon', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the notice board' }));
    fireEvent.click(screen.getByRole('button', { name: 'Meal planner' }));
    const monday = screen.getByLabelText('Monday') as HTMLInputElement;
    monday.focus();
    fireEvent.input(monday, { target: { value: 'P' } });
    expect(document.activeElement).toBe(monday);
    fireEvent.input(monday, { target: { value: 'Pasta' } });
    expect(monday.value).toBe('Pasta');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open the cupboard' }));
    fireEvent.click(screen.getByRole('button', { name: 'Top shelf, 0 items' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Rice' } });
    fireEvent.change(screen.getByLabelText(/Expiry date/), { target: { value: tomorrow } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.getByRole('dialog', { name: 'Cupboard · Top shelf' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: /Use soon/ }));
    expect(screen.getByText('Cupboard · Top shelf')).toBeTruthy();
    expect(screen.getByText('Rice')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).meals.mon).toBe('Pasta');
  });

  it('warns when saving fails but keeps working', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    render(<App />);
    addMilkToTopShelf();
    expect(screen.getByRole('alert').textContent).toBe("Couldn't save — try exporting a backup");
    expect(within(screen.getByRole('dialog')).getByText('Milk')).toBeTruthy();
  });
});
