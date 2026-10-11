import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { IItem } from '../domain/model';
import { Fridge } from './Fridge';

const items: IItem[] = [
  { id: '1', name: 'Milk', compartment: 'fridge-door', addedAt: '2026-10-11T08:00:00.000Z' },
  { id: '2', name: 'Ham', compartment: 'fridge-shelf-1', addedAt: '2026-10-11T08:00:00.000Z' },
  { id: '3', name: 'Cheese', compartment: 'fridge-shelf-1', addedAt: '2026-10-11T08:00:00.000Z' },
];

describe('Fridge', () => {
  it('starts with both doors closed', () => {
    render(<Fridge items={items} alertCount={0} onOpenCompartment={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Open the fridge' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'Open the freezer' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Top shelf/ })).toBeNull();
  });

  it('opens the fridge to show three shelves and the door compartment with counts', () => {
    render(<Fridge items={items} alertCount={0} onOpenCompartment={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the fridge' }));

    expect(screen.getByRole('button', { name: 'Close the fridge' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Top shelf, 2 items' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Middle shelf, 0 items' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bottom shelf, 0 items' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Door, 1 item' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /drawer/ })).toBeNull();
  });

  it('opens the freezer to show three drawers', () => {
    render(<Fridge items={items} alertCount={0} onOpenCompartment={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the freezer' }));
    expect(screen.getAllByRole('button', { name: /drawer, 0 items/ })).toHaveLength(3);
  });

  it('closes a door again', () => {
    render(<Fridge items={items} alertCount={0} onOpenCompartment={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the fridge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close the fridge' }));
    expect(screen.queryByRole('button', { name: /Top shelf/ })).toBeNull();
  });

  it('reports which compartment was tapped', () => {
    const onOpen = vi.fn();
    render(<Fridge items={items} alertCount={0} onOpenCompartment={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the fridge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Door, 1 item' }));
    expect(onOpen).toHaveBeenCalledWith('fridge-door');
  });

  it('shows how many items to use soon on the fridge door', () => {
    render(<Fridge items={items} alertCount={2} onOpenCompartment={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Open the fridge, 2 to use soon' })).toBeTruthy();
  });
});
