export type ReconciliationStatus = 'reconciled' | 'needs-review' | 'never';

// `lastReconciled` is written by the reconcile flow (see reconciliation.ts /
// Account.tsx's onDoneReconciling), and `unreconciledCount` is the live
// count of `cleared: true, reconciled: false` transactions on the account —
// the same set a completed reconcile sweeps to `reconciled: true`, so a
// non-zero count means the account has drifted since `lastReconciled`.
export function getReconciliationStatus(
  lastReconciled: string | null | undefined,
  unreconciledCount: number | null | undefined,
): ReconciliationStatus {
  if (!lastReconciled) {
    return 'never';
  }
  return (unreconciledCount ?? 0) > 0 ? 'needs-review' : 'reconciled';
}
