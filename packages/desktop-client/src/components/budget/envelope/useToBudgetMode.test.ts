import { describe, expect, it } from 'vitest';

import { envelopeBudget } from '#spreadsheet/bindings';

import { getToBudgetMode } from './useToBudgetMode';

describe('getToBudgetMode', () => {
  it('preserves the existing monthly behavior when the preference is absent', () => {
    expect(getToBudgetMode(undefined, '2026-09', '2026-09')).toEqual({
      includesFutureAssignments: false,
      toBudgetBinding: envelopeBudget.toBudget,
    });
  });

  it('includes future assignments for current and future months when enabled', () => {
    expect(getToBudgetMode('include-future', '2026-09', '2026-09')).toEqual({
      includesFutureAssignments: true,
      toBudgetBinding: envelopeBudget.toBudgetWithFuture,
    });
    expect(getToBudgetMode('include-future', '2026-10', '2026-09')).toEqual({
      includesFutureAssignments: true,
      toBudgetBinding: envelopeBudget.toBudgetWithFuture,
    });
  });

  it('preserves historical To Budget values when future assignments are enabled', () => {
    expect(getToBudgetMode('include-future', '2026-08', '2026-09')).toEqual({
      includesFutureAssignments: false,
      toBudgetBinding: envelopeBudget.toBudget,
    });
  });
});
