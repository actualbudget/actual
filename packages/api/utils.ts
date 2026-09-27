import {
  integerToAmount as decodeAmount,
  amountToInteger as encodeAmount,
} from '@actual-app/core/shared/util';

// Public scripts written for cents keep working; pass the budget's precision
// or currency code to convert at other scales.
export function amountToInteger(
  amount: number,
  precisionOrCurrency: number | string = 2,
): number {
  return encodeAmount(amount, precisionOrCurrency);
}

export function integerToAmount(
  integerAmount: number,
  precisionOrCurrency: number | string = 2,
): number {
  return decodeAmount(integerAmount, precisionOrCurrency);
}
