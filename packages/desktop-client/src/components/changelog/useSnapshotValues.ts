import type { ChangeLogSnapshot } from '@actual-app/core/server/changelog/types';
import { format as formatMonthUtil } from '@actual-app/core/shared/months';

import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';

import type { ChangeLogColumnSpec } from './changeLogColumns';

/**
 * `undefined` means the message log does not reach back far enough to know what
 * the value was, which is not the same as knowing it was empty. The two render
 * differently, so they stay distinct all the way to the cell.
 */
export const UNKNOWN = Symbol('unknown');

export type SnapshotCellValue = string | typeof UNKNOWN;

export type SnapshotValueReader = (
  snapshot: ChangeLogSnapshot,
  column: ChangeLogColumnSpec,
) => SnapshotCellValue;

export function useSnapshotValues(): SnapshotValueReader {
  const format = useFormat();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  return (snapshot, column) => {
    switch (column.id) {
      case 'date':
        if (snapshot.date === undefined) return UNKNOWN;
        return snapshot.date ? formatMonthUtil(snapshot.date, dateFormat) : '';

      case 'account':
        if (snapshot.accountName === undefined) return UNKNOWN;
        return snapshot.accountName ?? '';

      case 'payee':
        if (snapshot.payeeName === undefined) return UNKNOWN;
        return snapshot.payeeName ?? '';

      case 'notes':
        if (snapshot.notes === undefined) return UNKNOWN;
        return snapshot.notes ?? '';

      case 'category':
        if (snapshot.categoryName === undefined) return UNKNOWN;
        // The register shows "Categorize" here; in a historical view that
        // would read as an instruction, so leave it blank.
        return snapshot.categoryName ?? '';

      // A single signed amount feeds two columns, exactly as the register
      // splits it: negative is a payment, positive a deposit.
      case 'payment':
        if (snapshot.amount === undefined) return UNKNOWN;
        return snapshot.amount != null && snapshot.amount < 0
          ? format(-snapshot.amount, 'financial')
          : '';

      case 'deposit':
        if (snapshot.amount === undefined) return UNKNOWN;
        return snapshot.amount != null && snapshot.amount > 0
          ? format(snapshot.amount, 'financial')
          : '';

      default:
        return '';
    }
  };
}
