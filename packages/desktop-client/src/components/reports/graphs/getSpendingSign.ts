import type { balanceTypeOpType } from '@actual-app/core/types/models';

/**
 * -1 for spending, which is stored as negative amounts, so reports can show
 * it as positive.
 */
export function getSpendingSign(balanceTypeOp: balanceTypeOpType) {
  return balanceTypeOp === 'totalDebts' || balanceTypeOp === 'netDebts'
    ? -1
    : 1;
}
