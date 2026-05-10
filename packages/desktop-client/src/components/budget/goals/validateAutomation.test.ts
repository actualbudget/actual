import type { Template } from '@actual-app/core/types/models/templates';
import { describe, expect, it } from 'vitest';

import { validatePercentageAllocation } from './validateAutomation';

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
