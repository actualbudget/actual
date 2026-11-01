import type { Conversion } from '@actual-app/core/shared/fx/convert';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import { t } from 'i18next';

import type { CurrencyDisplayMode } from './displayMode';

type FormatInCurrency = (
  amount: IntegerAmount,
  currencyCode?: string,
) => string;

// Text for an amount of an account in another currency: the original
// amount, its value in the default currency, or both as
// "USD$760.03 (1,074.48)". "≈" marks an approximate conversion: no rate at
// all (counted 1:1) or only a rate from a later date.
export function formatForeignAmount({
  amount,
  currencyCode,
  mode,
  convert,
  format,
}: {
  amount: IntegerAmount;
  currencyCode: string;
  mode: CurrencyDisplayMode;
  convert: () => Conversion;
  // Formats an amount in `currencyCode`, or in the default currency when
  // no code is given
  format: FormatInCurrency;
}): string {
  const original = format(amount, currencyCode);
  if (mode === 'original') {
    return original;
  }

  const converted = convert();
  const isApproximate =
    converted.lookup === null || converted.lookup.isFallback;
  const convertedText = (isApproximate ? '≈' : '') + format(converted.amount);

  return mode === 'converted'
    ? convertedText
    : t('{{original}} ({{converted}})', {
        original,
        converted: convertedText,
      });
}
