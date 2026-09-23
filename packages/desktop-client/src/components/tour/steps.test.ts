import { describe, expect, it, vi } from 'vitest';

import { getTourSteps } from './steps';
import type { TourStepDeps } from './steps';

const deps: TourStepDeps = { navigate: vi.fn(), budgetType: 'envelope' };

describe('getTourSteps', () => {
  it('returns a tour that starts with a centered welcome step', () => {
    const steps = getTourSteps('budget-tour', deps);

    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].id).toBe('welcome');
    expect(steps[0].placement).toBe('center');
  });

  it('gives every step a unique id, a target, and content', () => {
    const steps = getTourSteps('budget-tour', deps);

    const ids = steps.map(step => step.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const step of steps) {
      expect(step.id).toBeTruthy();
      expect(step.target).toBeTruthy();
      expect(step.content).toBeTruthy();
      expect(step.title).toBeTruthy();
    }
  });

  it.each(['envelope', 'tracking'] as const)(
    'returns a complete tour for %s budgets',
    budgetType => {
      const steps = getTourSteps('budget-tour', { ...deps, budgetType });

      const summaryStep = steps.find(step => step.id === 'budget-summary');
      expect(summaryStep?.title).toBeTruthy();
      expect(summaryStep?.content).toBeTruthy();
      expect(summaryStep?.target).toBeTruthy();
    },
  );
});
