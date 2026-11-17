import { afterEach, describe, expect, it, vi } from 'vitest';

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

// In test mode, monthUtils.currentMonth() returns '2017-01'
const CURRENT_MONTH = '2017-01';

type BudgetPageOptions = {
  displayedMonths: string[];
  summaryMonths: string[];
};

// Mirrors the budget page: the month picker marks the displayed months, and
// the summaries strip renders one extra, clipped month on each side of them.
function renderBudgetPage({
  displayedMonths,
  summaryMonths,
}: BudgetPageOptions) {
  document.body.innerHTML = [
    ...displayedMonths.map(
      month =>
        `<div data-testid="selected-budget-month" data-month="${month}"></div>`,
    ),
    ...summaryMonths.map(
      month => `<div data-testid="budget-summary" data-month="${month}"></div>`,
    ),
  ].join('');
}

function findBudgetSummaryTarget(): HTMLElement | null {
  const steps = getTourSteps('budget-tour', deps);
  const target = steps.find(step => step.id === 'budget-summary')?.target;
  if (typeof target !== 'function') {
    throw new Error('Expected the budget summary step to resolve its target');
  }
  return target();
}

describe('budget summary step target', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('targets the current month when it is displayed', () => {
    renderBudgetPage({
      displayedMonths: ['2016-12', CURRENT_MONTH],
      summaryMonths: ['2016-11', '2016-12', CURRENT_MONTH, '2017-02'],
    });

    expect(findBudgetSummaryTarget()?.dataset.month).toBe(CURRENT_MONTH);
  });

  it('targets the first displayed month when the current month is not displayed', () => {
    renderBudgetPage({
      displayedMonths: ['2016-06', '2016-07'],
      summaryMonths: ['2016-05', '2016-06', '2016-07', '2016-08'],
    });

    expect(findBudgetSummaryTarget()?.dataset.month).toBe('2016-06');
  });

  it('ignores a current month summary that is rendered but not displayed', () => {
    renderBudgetPage({
      displayedMonths: ['2016-11', '2016-12'],
      summaryMonths: ['2016-10', '2016-11', '2016-12', CURRENT_MONTH],
    });

    expect(findBudgetSummaryTarget()?.dataset.month).toBe('2016-11');
  });

  it('falls back to the first summary when the month picker is not rendered', () => {
    renderBudgetPage({
      displayedMonths: [],
      summaryMonths: ['2016-05', '2016-06'],
    });

    expect(findBudgetSummaryTarget()?.dataset.month).toBe('2016-05');
  });
});
