import { effectiveRate } from '@actual-app/core/shared/exchange-rate';
import {
  isPreviewId,
  isTemporaryId,
} from '@actual-app/core/shared/transactions';
import {
  getNumberFormat,
  integerToCurrency,
} from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import type { TFunction } from 'i18next';

type Pair = {
  native: number;
  base: number;
  account: Pick<AccountEntity, 'name' | 'currency' | 'currency_precision'>;
  basePrecision: number;
  baseCurrency: string;
};

/**
 * An amount in a recorded precision, labeled with its currency code so it
 * reads the same inside any register's currency format.
 */
export function formatInCurrency(
  amount: number,
  currency: string,
  precision: number,
) {
  const { formatter } = getNumberFormat({ decimalPlaces: precision });
  return `${integerToCurrency(amount, formatter, precision)} ${currency}`.trim();
}

/** The effective-rate sentence for a stored pair. */
export function effectiveRateText(
  t: TFunction,
  { native, base, account, basePrecision, baseCurrency }: Pair,
) {
  const rate = effectiveRate(
    base,
    basePrecision,
    native,
    account.currency_precision ?? 0,
  );
  return rate
    ? t('Effective rate: 1 {{currency}} = {{rate}} {{base}}.', {
        base: baseCurrency,
        rate,
        currency: account.currency,
      })
    : t('No effective rate (one amount is zero).');
}

/**
 * Describes the half of a foreign pair a view does not show: the base in a
 * native register, the native amount anywhere amounts are in the budget
 * currency.
 */
export function amountDetailsText(
  t: TFunction,
  pair: Pair,
  nativeView: boolean,
) {
  const shown = nativeView
    ? t('Base: {{amount}}.', {
        amount: formatInCurrency(
          pair.base,
          pair.baseCurrency,
          pair.basePrecision,
        ),
      })
    : t('{{amount}} in {{account}}.', {
        amount: formatInCurrency(
          pair.native,
          pair.account.currency ?? '',
          pair.account.currency_precision ?? 0,
        ),
        account: pair.account.name,
      });
  return `${shown} ${effectiveRateText(t, pair)}`;
}

/**
 * The stored base and native amounts of a row in either register view, and
 * whether the view shows the native half.
 */
export function storedPair(
  transaction: Pick<TransactionEntity, 'amount' | 'transaction_amount'> & {
    _baseAmount?: number;
  },
) {
  if (transaction._baseAmount !== undefined) {
    return {
      native: transaction.amount,
      base: transaction._baseAmount,
      nativeView: true,
    };
  }
  return transaction.transaction_amount != null
    ? {
        native: transaction.transaction_amount,
        base: transaction.amount,
        nativeView: false,
      }
    : null;
}

/**
 * The one saved foreign row whose amount details a selection can show, or
 * null (base rows, drafts, previews and multiple rows have none).
 */
export function amountDetailsTarget(
  ids: string[],
  getTransaction: (id: string) => TransactionEntity | undefined,
  accounts: Pick<AccountEntity, 'id' | 'currency'>[],
): string | null {
  if (ids.length !== 1) return null;
  const transaction = getTransaction(ids[0]);
  if (!transaction || isPreviewId(transaction.id)) return null;
  if (isTemporaryId(transaction.id)) return null;
  const account = accounts.find(a => a.id === transaction.account);
  return account?.currency && transaction.transaction_amount != null
    ? transaction.id
    : null;
}

/**
 * The native amount a list in the budget currency shows beneath a foreign
 * row's base; null in native views and for budget-currency rows.
 */
export function nativeLine(
  transaction: Parameters<typeof storedPair>[0],
  account: Pick<AccountEntity, 'currency' | 'currency_precision'> | undefined,
) {
  const pair = account?.currency ? storedPair(transaction) : null;
  return pair && !pair.nativeView && account?.currency
    ? formatInCurrency(
        pair.native,
        account.currency,
        account.currency_precision ?? 0,
      )
    : null;
}
