import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ADD_ACCOUNT_STEP_ID,
  ADD_SCHEDULE_STEP_ID,
  findBudgetSummary,
  getTourSteps,
  IMPORT_STEP_ID,
} from './steps';
import type { TourStepData, TourStepDeps } from './steps';
import { TOUR_IDS } from './TourProvider';

const deps: TourStepDeps = {
  navigate: vi.fn(),
  t: key => key,
  budgetType: 'envelope',
};

describe('getTourSteps', () => {
  it('returns a welcome tour that starts with a centered welcome step', () => {
    const steps = getTourSteps('welcome-tour', deps);

    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].id).toBe('welcome');
    expect(steps[0].placement).toBe('center');
  });

  it.each(TOUR_IDS)(
    'gives every step of %s a unique id, a target, content and a chapter',
    tourId => {
      const steps = getTourSteps(tourId, deps);

      expect(steps.length).toBeGreaterThan(0);
      const ids = steps.map(step => step.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const step of steps) {
        expect(step.id).toBeTruthy();
        expect(step.target).toBeTruthy();
        expect(step.content).toBeTruthy();
        expect(step.title).toBeTruthy();
        expect((step.data as TourStepData).chapter).toBeTruthy();
      }
    },
  );

  it('keeps the tours short so they can be taken one chapter at a time', () => {
    for (const tourId of TOUR_IDS) {
      expect(getTourSteps(tourId, deps).length).toBeLessThanOrEqual(7);
    }
  });

  it('marks the steps that ask the user to click something as interactive', () => {
    const welcome = getTourSteps('welcome-tour', deps);
    const addAccount = welcome.find(step => step.id === ADD_ACCOUNT_STEP_ID);
    expect((addAccount?.data as TourStepData).interactive).toBe(true);

    const accounts = getTourSteps('accounts-tour', deps);
    const importStep = accounts.find(step => step.id === IMPORT_STEP_ID);
    expect((importStep?.data as TourStepData).interactive).toBe(true);

    const schedules = getTourSteps('schedules-tour', deps);
    const addSchedule = schedules.find(
      step => step.id === ADD_SCHEDULE_STEP_ID,
    );
    expect((addSchedule?.data as TourStepData).interactive).toBe(true);
  });

  it.each(['envelope', 'tracking'] as const)(
    'returns a complete budget tour for %s budgets',
    budgetType => {
      const steps = getTourSteps('budget-tour', { ...deps, budgetType });

      const summaryStep = steps.find(step => step.id === 'budget-summary');
      expect(summaryStep?.title).toBeTruthy();
      expect(summaryStep?.content).toBeTruthy();
      expect(summaryStep?.target).toBeTruthy();
    },
  );

  it('opens the first account when the accounts tour knows one', () => {
    const navigate = vi.fn();
    const steps = getTourSteps('accounts-tour', {
      ...deps,
      navigate,
      firstAccountId: 'acct-1',
    });
    expect(steps[0].before).toBeTypeOf('function');
  });

  it('only explains bank sync when a sync server is available', () => {
    const withoutServer = getTourSteps('accounts-tour', {
      ...deps,
      hasServer: false,
    });
    const withServer = getTourSteps('accounts-tour', {
      ...deps,
      hasServer: true,
    });

    expect(withoutServer.some(step => step.id === 'bank-sync')).toBe(false);
    expect(withServer.some(step => step.id === 'bank-sync')).toBe(true);
  });

  it('translates chapter names with the provided function', () => {
    const t = vi.fn((key: string) => `translated:${key}`);
    const steps = getTourSteps('reports-tour', { ...deps, t });

    expect(t).toHaveBeenCalledWith('Explore reports');
    expect((steps[0].data as TourStepData).chapter).toBe(
      'translated:Explore reports',
    );
  });
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
  expect(target).toBe(findBudgetSummary);
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
