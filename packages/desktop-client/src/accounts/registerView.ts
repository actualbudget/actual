import type { TransactionEntity } from '@actual-app/core/types/models';

/**
 * A foreign account's register shows a native view: `amount` carries the
 * native integer and the stored base is kept as `_baseAmount`. Only the
 * foreign entry path turns native values into a frozen pair.
 */
export function toRegisterView(
  rows: TransactionEntity[],
  isForeign: boolean,
): TransactionEntity[] {
  if (!isForeign) return rows;
  return rows.map(row =>
    // Rows already in view form are returned unchanged.
    row.transaction_amount != null && row._baseAmount === undefined
      ? { ...row, amount: row.transaction_amount, _baseAmount: row.amount }
      : row,
  );
}

/** Restores stored rows from the native view before any whole-row write. */
export function fromRegisterView(
  rows: TransactionEntity[],
): TransactionEntity[] {
  return rows.map(({ _baseAmount, ...row }) =>
    _baseAmount === undefined ? row : { ...row, amount: _baseAmount },
  );
}
