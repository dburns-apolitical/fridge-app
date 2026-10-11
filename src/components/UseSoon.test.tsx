import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { IItem } from '../domain/model';
import { UseSoon } from './UseSoon';

const today = '2026-10-11';
const items: IItem[] = [
  { id: '1', name: 'Ham', expiry: '2026-10-09', compartment: 'fridge-shelf-2', addedAt: '2026-10-01T08:00:00.000Z' },
  { id: '2', name: 'Milk', expiry: '2026-10-12', compartment: 'fridge-door', addedAt: '2026-10-01T08:00:00.000Z' },
];

describe('UseSoon', () => {
  it('lists items with where they are and when they expire', () => {
    render(<UseSoon items={items} today={today} soonDays={3} onOpenCompartment={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Use soon' })).toBeTruthy();
    expect(screen.getByText('Middle shelf')).toBeTruthy();
    expect(screen.getByText('Expired 2 days ago')).toBeTruthy();
    expect(screen.getByText('Door')).toBeTruthy();
    expect(screen.getByText('Expires tomorrow')).toBeTruthy();
  });

  it('marks expired and soon rows differently', () => {
    render(<UseSoon items={items} today={today} soonDays={3} onOpenCompartment={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Ham/ }).className).toContain('soon-row--expired');
    expect(screen.getByRole('button', { name: /Milk/ }).className).toContain('soon-row--soon');
  });

  it('opens the compartment when a row is tapped', () => {
    const onOpen = vi.fn();
    render(<UseSoon items={items} today={today} soonDays={3} onOpenCompartment={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Milk/ }));
    expect(onOpen).toHaveBeenCalledWith('fridge-door');
  });

  it('shows a friendly empty state', () => {
    render(<UseSoon items={[]} today={today} soonDays={3} onOpenCompartment={vi.fn()} />);
    expect(screen.getByText('Nothing expiring in the next 3 days.')).toBeTruthy();
  });

  it('words the empty state for zero soon days', () => {
    render(<UseSoon items={[]} today={today} soonDays={0} onOpenCompartment={vi.fn()} />);
    expect(screen.getByText('Nothing has expired.')).toBeTruthy();
  });
});
