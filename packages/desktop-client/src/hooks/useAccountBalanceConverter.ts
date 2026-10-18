import { useMemo } from 'react';

import { convertWithRates } from '@actual-app/core/shared/fx/convert';
import { getEffectiveCurrency } from '@actual-app/core/shared/fx/currency';
import type { IntegerAmount } from '@actual-app/core/shared/util';

import { parseConversionRateMode } from '#components/currency/displayMode';

import { useAccounts } from './useAccounts';
import { useExchangeRates } from './useExchangeRates';
import { useMultiCurrency } from './useMultiCurrency';
import { useSyncedPref } from './useSyncedPref';

// Values the balance of an account in the budget's default currency on
// `date`: with the rate on or before that date, or the latest rate,
// depending on the user's rate setting
export type AccountBalanceConverter = (
  amount: IntegerAmount,
  accountId: string,
  date: string,
) => { amount: IntegerAmount; isApproximate: boolean };

// Undefined when no account uses another currency, so reports keep adding
// balances up as they are; null while the rates are still loading, so a
// report can wait instead of adding everything up 1:1 first
export function useAccountBalanceConverter():
  | AccountBalanceConverter
  | undefined
  | null {
  const { isEnabled, defaultCurrencyCode } = useMultiCurrency();
  const { rateIndex, isLoading } = useExchangeRates({ enabled: isEnabled });
  const { data: accounts } = useAccounts();
  const [rateModePref] = useSyncedPref('currency-conversion-rate');
  const rateMode = parseConversionRateMode(rateModePref);

  // Reports reload whenever the converter changes, so it must keep its
  // identity across renders
  return useMemo(() => {
    if (!isEnabled || !accounts) {
      return undefined;
    }
    const currencyByAccount = new Map(
      accounts.map(account => [
        account.id,
        getEffectiveCurrency(account.currency, defaultCurrencyCode),
      ]),
    );
    const hasOtherCurrencies = [...currencyByAccount.values()].some(
      currency => currency !== defaultCurrencyCode,
    );
    if (!hasOtherCurrencies) {
      return undefined;
    }
    if (isLoading) {
      return null;
    }

    const convert: AccountBalanceConverter = (amount, accountId, date) => {
      const currency = currencyByAccount.get(accountId) ?? defaultCurrencyCode;
      if (currency === defaultCurrencyCode) {
        return { amount, isApproximate: false };
      }
      const converted = convertWithRates(
        amount,
        currency,
        defaultCurrencyCode,
        rateIndex,
        rateMode === 'historical' ? date : undefined,
      );
      return {
        amount: converted.amount,
        isApproximate: converted.lookup === null || converted.lookup.isFallback,
      };
    };
    return convert;
  }, [
    isEnabled,
    accounts,
    defaultCurrencyCode,
    rateIndex,
    rateMode,
    isLoading,
  ]);
}
