import { convertWithRates } from '@actual-app/core/shared/fx/convert';
import type { Conversion } from '@actual-app/core/shared/fx/convert';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';

import {
  DEFAULT_CURRENCY_DISPLAY_MODE,
  parseConversionRateMode,
  parseCurrencyDisplayMode,
} from '#components/currency/displayMode';
import type { CurrencyDisplayMode } from '#components/currency/displayMode';
import { formatForeignAmount } from '#components/currency/formatCurrencyAmount';

import { useExchangeRates } from './useExchangeRates';
import { useFormat } from './useFormat';
import type { FormatType } from './useFormat';
import { useMultiCurrency } from './useMultiCurrency';
import { useSyncedPref } from './useSyncedPref';
import { useSyncedPrefs } from './useSyncedPrefs';

type FormatAmountOptions = {
  mode?: CurrencyDisplayMode;
  // The date of the amount. With the historical rate setting it is
  // converted with the rate on or before this date; otherwise, or when
  // omitted, with the latest rate.
  date?: string;
  type?: FormatType;
};

const DISPLAY_MODE_PREF = 'currency-display-mode';

// Formats amounts that belong to a specific currency. Amounts in the
// budget's default currency are formatted as usual; amounts in other
// currencies carry their code and, depending on the display mode, their
// value converted into the default currency.
export function useCurrencyFormatter() {
  const format = useFormat();
  const { isEnabled, defaultCurrencyCode, getAccountCurrency } =
    useMultiCurrency();
  const { rateIndex } = useExchangeRates({ enabled: isEnabled });
  const [syncedPrefs] = useSyncedPrefs();
  const [conversionRatePref] = useSyncedPref('currency-conversion-rate');

  const getDisplayMode = (accountId?: string): CurrencyDisplayMode =>
    (accountId
      ? parseCurrencyDisplayMode(
          syncedPrefs[`${DISPLAY_MODE_PREF}-${accountId}`],
        )
      : null) ??
    parseCurrencyDisplayMode(syncedPrefs[DISPLAY_MODE_PREF]) ??
    DEFAULT_CURRENCY_DISPLAY_MODE;

  const conversionRateMode = parseConversionRateMode(conversionRatePref);

  const isForeignCurrency = (currencyCode: string) =>
    isEnabled && currencyCode !== defaultCurrencyCode;

  const convertToDefault = (
    amount: IntegerAmount,
    currencyCode: string,
    date?: string,
  ): Conversion =>
    convertWithRates(
      amount,
      currencyCode,
      defaultCurrencyCode,
      rateIndex,
      // The latest-rate setting values past amounts at today's rate
      conversionRateMode === 'historical' ? date : undefined,
    );

  const formatAmount = (
    amount: IntegerAmount,
    currencyCode: string,
    { mode = 'original', date, type = 'financial' }: FormatAmountOptions = {},
  ): string => {
    if (!isForeignCurrency(currencyCode)) {
      return format(amount, type);
    }

    return formatForeignAmount({
      amount,
      currencyCode,
      mode,
      convert: () => convertToDefault(amount, currencyCode, date),
      format: (value, code) =>
        format(value, type, code ? { currencyCode: code } : undefined),
    });
  };

  const formatAccountAmount = (
    amount: IntegerAmount,
    account: Pick<AccountEntity, 'id' | 'currency'>,
    options: FormatAmountOptions = {},
  ) =>
    formatAmount(amount, getAccountCurrency(account), {
      mode: getDisplayMode(account.id),
      ...options,
    });

  return {
    isEnabled,
    defaultCurrencyCode,
    getAccountCurrency,
    getDisplayMode,
    conversionRateMode,
    isForeignCurrency,
    convertToDefault,
    formatAmount,
    formatAccountAmount,
  };
}
