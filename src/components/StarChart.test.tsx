import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { IStarWeek } from '../domain/model';
import { StarChart } from './StarChart';

const weeks: IStarWeek[] = [
  { criteria: [{ id: 'teeth', label: 'Teeth' }], stars: { 'teeth:mon': true } },
  { criteria: [{ id: 'teeth', label: 'Brushing' }], stars: {} },
];

describe('StarChart', () => {
  it('opens on the latest week and pages back to a scored week', () => {
    const onToggle = vi.fn();
    render(
      <StarChart
        weeks={weeks}
        liveCriteria={[{ id: 'teeth', label: 'Brushing' }]}
        onToggle={onToggle}
        onNewWeek={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Week 2' })).toBeTruthy();
    expect(screen.getByLabelText('0 of 7 stars').textContent).toBe('0/7');
    expect(screen.getByRole('button', { name: 'Next week' }).hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByRole('heading', { name: 'Week 1' })).toBeTruthy();
    expect(screen.getByLabelText('1 of 7 stars').textContent).toBe('1/7');
    fireEvent.click(screen.getByRole('button', { name: 'Monday, Teeth, starred' }));
    expect(onToggle).toHaveBeenCalledWith(0, 'teeth', 'mon');
  });

  it('follows a new week and marks a removed row as kept', () => {
    const onNewWeek = vi.fn();
    const { rerender } = render(
      <StarChart
        weeks={[weeks[0]]}
        liveCriteria={[]}
        onToggle={vi.fn()}
        onNewWeek={onNewWeek}
      />,
    );
    expect(screen.getByText('kept')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'New week' }));
    expect(onNewWeek).toHaveBeenCalledOnce();

    rerender(
      <StarChart
        weeks={[...weeks, { criteria: [], stars: {} }]}
        liveCriteria={[]}
        onToggle={vi.fn()}
        onNewWeek={onNewWeek}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Week 3' })).toBeTruthy();
    expect(screen.getByLabelText('0 of 0 stars').textContent).toBe('0/0');
  });
});
