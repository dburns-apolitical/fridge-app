import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { createEmptyData } from '../domain/model';
import { HomePager } from './HomePager';

describe('HomePager', () => {
  it('slides to the notice board and back', () => {
    render(
      <HomePager data={createEmptyData()} alertCount={0} dispatch={vi.fn()} onOpenCompartment={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: "What's in the fridge?" })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Notice board' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open the notice board' }));
    expect(screen.getByRole('heading', { name: 'Notice board' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Star chart' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Meal planner' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open the cupboard' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: "What's in the fridge?" })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Star chart' }));
    expect(screen.getByRole('dialog', { name: 'Star chart' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Week 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Back to the fridge' }));
    expect(screen.getByRole('heading', { name: "What's in the fridge?" })).toBeTruthy();
  });
});
