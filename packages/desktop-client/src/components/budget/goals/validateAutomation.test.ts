import type { ScheduleEntity } from '@actual-app/core/types/models';
import type { Template } from '@actual-app/core/types/models/templates';
import { describe, expect, it } from 'vitest';

import {
  validateAutomation,
  validatePercentageAllocation,
} from './validateAutomation';

function percent(
  category: string,
  percent: number,
  previous = false,
): Template {
  return {
    type: 'percentage',
    percent,
    previous,
    category,
    directive: 'template',
    priority: 1,
  };
}

describe('validatePercentageAllocation', () => {
  it('returns null when no percentage templates are present', () => {
    expect(validatePercentageAllocation([])).toBeNull();
  });

  it('flags a single source over 100%', () => {
    expect(
      validatePercentageAllocation([
        percent('Salary', 60),
        percent('Salary', 50),
      ]),
    ).toEqual({ kind: 'percent-over-100', total: 110 });
  });

  it('does not sum across distinct income sources', () => {
    expect(
      validatePercentageAllocation([
        percent('Income-HSA', 100, true),
        percent('Interest-HSA', 100),
      ]),
    ).toBeNull();
  });

  it('treats this-month and last-month income as different sources', () => {
    expect(
      validatePercentageAllocation([
        percent('Salary', 100, false),
        percent('Salary', 100, true),
      ]),
    ).toBeNull();
  });

  it('ignores templates with a missing source', () => {
    const orphan = {
      ...percent('Salary', 100),
      category: null as unknown as string,
    };
    expect(validatePercentageAllocation([orphan])).toBeNull();
  });

  it('matches sources case-insensitively', () => {
    expect(
      validatePercentageAllocation([
        percent('Salary', 60),
        percent('salary', 50),
      ]),
    ).toEqual({ kind: 'percent-over-100', total: 110 });
  });
});

function averageTemplate(
  adjustment?: number,
  adjustmentType?: 'percent' | 'fixed',
): Template {
  return {
    type: 'average',
    numMonths: 3,
    directive: 'template',
    priority: 1,
    adjustment,
    adjustmentType,
  };
}

function scheduleTemplate(
  name: string,
  adjustment?: number,
  adjustmentType?: 'percent' | 'fixed',
): Template {
  return {
    type: 'schedule',
    name,
    directive: 'template',
    priority: 1,
    adjustment,
    adjustmentType,
  };
}

function schedule(name: string): ScheduleEntity {
  return {
    id: name,
    name,
    rule: 'rule-1',
    next_date: '2026-01-01',
    completed: false,
    posts_transaction: false,
    tombstone: false,
    _payee: 'payee-1',
    _account: 'account-1',
    _amount: 0,
    _amountOp: 'is',
    _date: '2026-01-01',
    _conditions: [],
    _actions: [],
  };
}

describe('validateAutomation adjustment range', () => {
  const today = new Date('2026-01-15');

  it('accepts an average with no adjustment', () => {
    expect(
      validateAutomation(averageTemplate(), 'historical', [], [], today),
    ).toBeNull();
  });

  it('accepts a percentage adjustment within range', () => {
    expect(
      validateAutomation(
        averageTemplate(10, 'percent'),
        'historical',
        [],
        [],
        today,
      ),
    ).toBeNull();
    // 1000% increase is the inclusive upper bound
    expect(
      validateAutomation(
        averageTemplate(1000, 'percent'),
        'historical',
        [],
        [],
        today,
      ),
    ).toBeNull();
  });

  it('flags a percentage increase above 1000%', () => {
    expect(
      validateAutomation(
        averageTemplate(1001, 'percent'),
        'historical',
        [],
        [],
        today,
      ),
    ).toEqual({ kind: 'adjustment-out-of-range' });
  });

  it('flags a percentage decrease of 100% or more', () => {
    expect(
      validateAutomation(
        averageTemplate(-100, 'percent'),
        'historical',
        [],
        [],
        today,
      ),
    ).toEqual({ kind: 'adjustment-out-of-range' });
  });

  it('does not range-check fixed adjustments', () => {
    expect(
      validateAutomation(
        averageTemplate(999999, 'fixed'),
        'historical',
        [],
        [],
        today,
      ),
    ).toBeNull();
  });

  it('flags an out-of-range adjustment on a schedule template', () => {
    expect(
      validateAutomation(
        scheduleTemplate('Rent', 2000, 'percent'),
        'schedule',
        [],
        [schedule('Rent')],
        today,
      ),
    ).toEqual({ kind: 'adjustment-out-of-range' });
  });

  it('reports a missing schedule before checking the adjustment', () => {
    expect(
      validateAutomation(
        scheduleTemplate('Rent', 2000, 'percent'),
        'schedule',
        [],
        [],
        today,
      ),
    ).toEqual({ kind: 'schedule-not-found', name: 'Rent' });
  });
});
