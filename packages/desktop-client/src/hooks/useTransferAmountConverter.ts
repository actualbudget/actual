import { useCallback, useMemo } from 'react';

import { convertWithRates } from '@actual-app/core/shared/fx/convert';
import type { IntegerAmount } from '@actual-app/core/shared/util';

import { useAccountCurrencies } from './useAccountCurrencies';
import { useExchangeRates } from './useExchangeRates';
import { useMultiCurrency } from './useMultiCurrency';

// The amount arriving in the other account of a transfer, in that
// account's currency, with the rate on or before `date`, as the server
// converts transfers nobody entered an amount for
export type TransferAmountConverter = (
  amount: IntegerAmount,
  fromAccountId: string,
  toAccountId: string,
  date: string,
) => IntegerAmount;

// Undefined while multiple currencies are off or every account uses the
// same currency, so transfers keep mirroring their amount without loading
// any rate
export function useTransferAmountConverter():
  | TransferAmountConverter
  | undefined {
  const { isEnabled } = useMultiCurrency();
  const currencyByAccount = useAccountCurrencies();
  const hasSeveralCurrencies =
    isEnabled && new Set(currencyByAccount.values()).size > 1;
  const { rateIndex } = useExchangeRates({ enabled: hasSeveralCurrencies });

  return useMemo(() => {
    if (!hasSeveralCurrencies) {
      return undefined;
    }
    const convert: TransferAmountConverter = (
      amount,
      fromAccountId,
      toAccountId,
      date,
    ) => {
      const from = currencyByAccount.get(fromAccountId);
      const to = currencyByAccount.get(toAccountId);
      return from && to && from !== to
        ? convertWithRates(amount, from, to, rateIndex, date).amount
        : amount;
    };
    return convert;
  }, [currencyByAccount, hasSeveralCurrencies, rateIndex]);
}

// Whether two accounts use different currencies, so that a transfer
// between them keeps its own amount on each side. Never while multiple
// currencies are off: transfers then mirror their amount.
export function useIsCrossCurrencyTransfer() {
  const { isEnabled } = useMultiCurrency();
  const currencyByAccount = useAccountCurrencies();

  return useCallback(
    (accountId: string, otherAccountId: string) => {
      const currency = currencyByAccount.get(accountId);
      const otherCurrency = currencyByAccount.get(otherAccountId);
      return (
        isEnabled &&
        currency !== undefined &&
        otherCurrency !== undefined &&
        currency !== otherCurrency
      );
    },
    [currencyByAccount, isEnabled],
  );
}
