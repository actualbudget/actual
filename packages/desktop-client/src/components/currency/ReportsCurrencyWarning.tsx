import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { findRate } from '@actual-app/core/shared/fx/rates';
import type { RateIndex } from '@actual-app/core/shared/fx/rates';
import { q } from '@actual-app/core/shared/query';

import { useAccounts } from '#hooks/useAccounts';
import { useExchangeRates } from '#hooks/useExchangeRates';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { useQuery } from '#hooks/useQuery';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { parseConversionRateMode } from './displayMode';

// Reports add up accounts in different currencies with the exchange rates.
// This warns when that can't be accurate: a currency has no rate at all and
// counts 1:1, or, with rates on each date, transactions predate the first
// rate of their currency.
export function ReportsCurrencyWarning() {
  const { t } = useTranslation();
  const { isEnabled, defaultCurrencyCode, getAccountCurrency } =
    useMultiCurrency();
  const { rateIndex } = useExchangeRates({ enabled: isEnabled });
  const { data: accounts = [] } = useAccounts();
  const [rateModePref] = useSyncedPref('currency-conversion-rate');
  const isHistorical = parseConversionRateMode(rateModePref) === 'historical';

  const foreignAccounts = isEnabled
    ? accounts.filter(
        account => getAccountCurrency(account) !== defaultCurrencyCode,
      )
    : [];
  // A string, so the query only reruns when the set of accounts changes
  const foreignAccountKey = foreignAccounts
    .map(account => account.id)
    .join(',');

  // The date of the first transaction of each account
  const { data: firstDates } = useQuery<{ account: string; date: string }>(
    () =>
      isHistorical && foreignAccountKey !== ''
        ? q('transactions')
            .filter({ account: { $oneof: foreignAccountKey.split(',') } })
            .groupBy('account')
            .select(['account', { date: { $min: '$date' } }])
        : null,
    [isHistorical, foreignAccountKey],
  );

  if (foreignAccounts.length === 0) {
    return null;
  }

  const currencies = [
    ...new Set(foreignAccounts.map(account => getAccountCurrency(account))),
  ];
  const withoutRate = currencies.filter(
    currency => findRate(rateIndex, currency, defaultCurrencyCode) === null,
  );
  const withLaterRates = isHistorical
    ? getCurrenciesBeforeFirstRate(
        (firstDates ?? []).flatMap(({ account: accountId, date }) => {
          const account = foreignAccounts.find(({ id }) => id === accountId);
          return account && date
            ? [{ currency: getAccountCurrency(account), date }]
            : [];
        }),
        rateIndex,
        defaultCurrencyCode,
      )
    : [];

  if (withoutRate.length === 0 && withLaterRates.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 5, marginBottom: 10 }}>
      {withoutRate.length > 0 && (
        <Text style={{ color: theme.warningText, lineHeight: 1.5 }}>
          {t(
            'Reports count {{currencies}} 1:1 against {{currency}} because there is no exchange rate yet.',
            {
              currencies: withoutRate.join(', '),
              currency: defaultCurrencyCode,
            },
          )}
        </Text>
      )}
      {withLaterRates.length > 0 && (
        <Text style={{ color: theme.warningText, lineHeight: 1.5 }}>
          {t(
            'Some {{currencies}} transactions are older than the first exchange rate, so they are converted with a later one.',
            { currencies: withLaterRates.join(', ') },
          )}
        </Text>
      )}
    </View>
  );
}

// The currencies whose first transaction predates every rate into
// `defaultCurrencyCode`, so some of their amounts are converted with a
// later rate. Only the first transaction of each currency is checked: when
// it has a rate on or before its date, every later one does too. Currencies
// without any rate aren't included.
export function getCurrenciesBeforeFirstRate(
  firstDates: ReadonlyArray<{ currency: string; date: string }>,
  rateIndex: RateIndex,
  defaultCurrencyCode: string,
): string[] {
  // Dates compare chronologically as strings
  const firstDateByCurrency = new Map<string, string>();
  for (const { currency, date } of firstDates) {
    const firstDate = firstDateByCurrency.get(currency);
    if (firstDate === undefined || date < firstDate) {
      firstDateByCurrency.set(currency, date);
    }
  }
  return [...firstDateByCurrency]
    .filter(
      ([currency, date]) =>
        findRate(rateIndex, currency, defaultCurrencyCode, date)?.isFallback,
    )
    .map(([currency]) => currency);
}
