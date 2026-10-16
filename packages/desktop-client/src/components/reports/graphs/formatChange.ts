import type { balanceTypeOpType } from '@actual-app/core/types/models';

import type { FormatType } from '#hooks/useFormat';

import { getSpendingSign } from './getSpendingSign';

/**
 * A change from a baseline, with a plus sign when it's positive. Spending is
 * shown as positive amounts, so its changes are flipped to match: more
 * spending reads as a rise.
 */
export function formatChange(
  change: number,
  format: (value: unknown, type: FormatType) => string,
  balanceTypeOp: balanceTypeOpType,
) {
  // `|| 0` keeps a flipped zero from showing as -0
  const shown = getSpendingSign(balanceTypeOp) * change || 0;
  return (shown > 0 ? '+' : '') + format(shown, 'financial');
}
