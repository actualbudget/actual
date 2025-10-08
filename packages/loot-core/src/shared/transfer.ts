import type { TransactionEntity } from '../types/models';

import { getCurrency } from './currencies';

/**
 * Check if a transaction has a foreign exchange rate set
 */
export function hasForeignExchangeRate(
  transaction: TransactionEntity,
): boolean {
  return (
    transaction.fx_rate != null &&
    transaction.fx_rate !== 0 &&
    transaction.fx_rate !== 1
  );
}

/**
 * Calculate the transfer amount accounting for different decimal places between currencies.
 *
 * This is a pure function that can be used on both server and client.
 *
 * For example, converting $10.94 USD (1094 cents) to BTC at rate 0.00001128:
 * - USD has 2 decimal places, BTC has 8
 * - Result should be 0.00012340 BTC (12340 satoshis)
 * - Formula: amount * rate / 10^(sourceDecimals - targetDecimals)
 *
 * @param sourceAmount - Amount in source currency's smallest unit (e.g., cents, satoshis)
 * @param fxRate - Exchange rate (target per source)
 * @param sourceDecimals - Decimal places of source currency
 * @param targetDecimals - Decimal places of target currency
 * @returns Amount in target currency's smallest unit (negated for transfer)
 */
export function calculateTransferAmountFromDecimals(
  sourceAmount: number,
  fxRate: number,
  sourceDecimals: number,
  targetDecimals: number,
): number {
  const decimalDiff = sourceDecimals - targetDecimals;

  if (decimalDiff === 0) {
    return -Math.round(sourceAmount * fxRate);
  }

  // Adjust for decimal place difference
  const scaleFactor = Math.pow(10, decimalDiff);
  return -Math.round((sourceAmount * fxRate) / scaleFactor);
}

/**
 * Calculate the foreign amount for display (not negated, absolute value).
 *
 * @param sourceAmount - Amount in source currency's smallest unit
 * @param fxRate - Exchange rate (target per source)
 * @param sourceCurrency - Source currency code (e.g., 'USD')
 * @param targetCurrency - Target currency code (e.g., 'BTC')
 * @returns Amount in target currency's smallest unit (positive)
 */
export function calculateForeignAmount(
  sourceAmount: number,
  fxRate: number,
  sourceCurrency: string,
  targetCurrency: string,
): number {
  const sourceDecimals = getCurrency(sourceCurrency).decimalPlaces;
  const targetDecimals = getCurrency(targetCurrency).decimalPlaces;

  // Use the same calculation as transfer, but return absolute value
  const transferAmount = calculateTransferAmountFromDecimals(
    sourceAmount,
    fxRate,
    sourceDecimals,
    targetDecimals,
  );

  return Math.abs(transferAmount);
}

/**
 * Calculate the FX rate from source and target amounts.
 *
 * @param sourceAmount - Amount in source currency's smallest unit
 * @param targetAmount - Amount in target currency's smallest unit
 * @param sourceCurrency - Source currency code
 * @param targetCurrency - Target currency code
 * @returns Exchange rate (target per source)
 */
export function calculateFxRateFromAmounts(
  sourceAmount: number,
  targetAmount: number,
  sourceCurrency: string,
  targetCurrency: string,
): number {
  const sourceDecimals = getCurrency(sourceCurrency).decimalPlaces;
  const targetDecimals = getCurrency(targetCurrency).decimalPlaces;
  const decimalDiff = sourceDecimals - targetDecimals;
  const scaleFactor = Math.pow(10, decimalDiff);

  return (targetAmount * scaleFactor) / Math.abs(sourceAmount);
}

/**
 * Validates if two transactions can be linked as a transfer.
 *
 * For regular transfers: amounts must zero each other out.
 * For FX transfers: if either transaction has an fx_rate, amounts can differ
 * as the rate accounts for the currency conversion (and optional fees if using splits).
 */
export function validForTransfer(
  fromTransaction: TransactionEntity,
  toTransaction: TransactionEntity,
) {
  if (
    // not already a transfer
    [fromTransaction, toTransaction].every(tran => tran.transfer_id == null) &&
    fromTransaction.account !== toTransaction.account // belong to different accounts
  ) {
    // Check if either transaction has an FX rate (indicates foreign exchange)
    const isFxTransfer =
      hasForeignExchangeRate(fromTransaction) ||
      hasForeignExchangeRate(toTransaction);

    if (isFxTransfer) {
      // For FX transfers, allow different amounts since the fx_rate
      // explains the difference (currency conversion and/or fees)
      return true;
    }

    // For regular transfers, amounts must zero each other out
    if (fromTransaction.amount + toTransaction.amount === 0) {
      return true;
    }
  }
  return false;
}
