import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { emptyMeals } from '../domain/model';
import { MealPlanner } from './MealPlanner';

describe('MealPlanner', () => {
  it('edits one meal per day', () => {
    const onChange = vi.fn();
    render(<MealPlanner meals={{ ...emptyMeals(), mon: 'Soup' }} onChange={onChange} />);
    const monday = screen.getByLabelText('Monday') as HTMLInputElement;
    expect(monday.value).toBe('Soup');
    fireEvent.input(monday, { target: { value: 'Pasta' } });
    expect(onChange).toHaveBeenCalledWith('mon', 'Pasta');
    expect(screen.getByLabelText('Sunday')).toBeTruthy();
  });
});
