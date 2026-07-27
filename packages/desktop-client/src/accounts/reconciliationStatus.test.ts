import { describe, expect, it } from 'vitest';

import { getReconciliationStatus } from './reconciliationStatus';

describe('getReconciliationStatus', () => {
  it('is never when the account has no last_reconciled date', () => {
    expect(getReconciliationStatus(null, 0)).toBe('never');
    expect(getReconciliationStatus(undefined, 0)).toBe('never');
    expect(getReconciliationStatus(null, 3)).toBe('never');
  });

  it('is reconciled when nothing has drifted since the last reconcile', () => {
    expect(getReconciliationStatus('2026-01-01', 0)).toBe('reconciled');
    expect(getReconciliationStatus('2026-01-01', null)).toBe('reconciled');
    expect(getReconciliationStatus('2026-01-01', undefined)).toBe('reconciled');
  });

  it('needs review when cleared transactions have landed since the last reconcile', () => {
    expect(getReconciliationStatus('2026-01-01', 1)).toBe('needs-review');
    expect(getReconciliationStatus('2026-01-01', 5)).toBe('needs-review');
  });
});
