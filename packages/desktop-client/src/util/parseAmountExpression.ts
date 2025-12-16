import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { currencyToAmount } from 'loot-core/shared/util';

export function parseAmountExpression(expression: string): number | null {
  const trimmed = expression.trim();
  if (trimmed === '') {
    return null;
  }

  const arithmetic = evalArithmetic(trimmed, null);
  if (arithmetic != null) {
    return arithmetic;
  }

  const asAmount = currencyToAmount(trimmed);
  return asAmount != null && !isNaN(asAmount) ? asAmount : null;
}
