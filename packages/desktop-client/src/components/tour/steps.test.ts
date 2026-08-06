import { describe, expect, it, vi } from 'vitest';

import { getTourSteps } from './steps';

const deps = { navigate: vi.fn() };

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
});
