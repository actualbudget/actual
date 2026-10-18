import { useCallback, useMemo } from 'react';

import {
  convertAmount,
  convertWithRates,
} from '@actual-app/core/shared/fx/convert';
import { getEffectiveCurrency } from '@actual-app/core/shared/fx/currency';
import type { RateIndex } from '@actual-app/core/shared/fx/rates';
import type { IntegerAmount } from '@actual-app/core/shared/util';

import { useAccounts } from './useAccounts';
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

// Converts with the rate on or before `date`. A rate so absurd that the
// amount isn't safe anymore counts 1:1 instead, so rendering never fails.
export function convertTransferAmountWithRates(
  amount: IntegerAmount,
  fromCurrency: string,
  toCurrency: string,
  rateIndex: RateIndex,
  date: string,
): IntegerAmount {
  try {
    return convertWithRates(amount, fromCurrency, toCurrency, rateIndex, date)
      .amount;
  } catch {
    return convertAmount(amount, toCurrency, 1);
  }
}

// Undefined while multiple currencies are off or every account uses the
// same currency, so transfers keep mirroring their amount without loading
// any rate
export function useTransferAmountConverter():
  | TransferAmountConverter
  | undefined {
  const { isEnabled, defaultCurrencyCode } = useMultiCurrency();
  const { data: accounts } = useAccounts();

  const currencyByAccount = useMemo(
    () =>
      new Map(
        (accounts ?? []).map(account => [
          account.id,
          getEffectiveCurrency(account.currency, defaultCurrencyCode),
        ]),
      ),
    [accounts, defaultCurrencyCode],
  );
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
        ? convertTransferAmountWithRates(amount, from, to, rateIndex, date)
        : amount;
    };
    return convert;
  }, [currencyByAccount, hasSeveralCurrencies, rateIndex]);
}

// Whether two accounts use different currencies, so that a transfer
// between them keeps its own amount on each side. Never while multiple
// currencies are off: transfers then mirror their amount.
export function useIsCrossCurrencyTransfer() {
  const { isEnabled, defaultCurrencyCode } = useMultiCurrency();
  const { data: accounts } = useAccounts();

  return useCallback(
    (accountId: string, otherAccountId: string) => {
      if (!isEnabled) {
        return false;
      }
      const currencyOf = (id: string) => {
        const account = accounts?.find(candidate => candidate.id === id);
        return account
          ? getEffectiveCurrency(account.currency, defaultCurrencyCode)
          : '';
      };
      const currency = currencyOf(accountId);
      const otherCurrency = currencyOf(otherAccountId);
      return (
        currency !== '' && otherCurrency !== '' && currency !== otherCurrency
      );
    },
    [accounts, defaultCurrencyCode, isEnabled],
  );
}
