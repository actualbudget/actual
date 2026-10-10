import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { listen, send } from '@actual-app/core/platform/client/connection';
import { isReviewedCurrency } from '@actual-app/core/shared/amount-encoding';
import { currencies } from '@actual-app/core/shared/currencies';
import { q } from '@actual-app/core/shared/query';

import { useMulticurrencyAvailable } from '#hooks/useMulticurrencyAvailable';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { aqlQuery } from '#queries/aqlQuery';

import { useCurrencyOptions } from './Currency';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

type ManualKind = 'dated' | 'standing';

type RateRow = {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: string;
  kind: ManualKind | 'fetched';
  source: string;
  timestamp: string;
};

type RateResolution =
  | {
      status: 'resolved';
      rate: string;
      kind: string;
      source: string;
      timestamp: string | null;
      fallback: boolean;
    }
  | { status: 'unavailable' }
  | { status: 'error' };

/** UTC day, matching stored rate timestamps. */
function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function utcDay(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function errorCode(error: unknown): string {
  if (typeof error === 'string') return error;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return '';
}

function errorText(error: unknown, t: (key: string) => string): string {
  const code = errorCode(error);
  switch (code) {
    case 'rate-invalid':
      return t('Enter a positive rate, such as 150.5.');
    case 'date-invalid':
      return t('Enter a valid date.');
    case 'rate-currency-invalid':
      return t('Choose a currency other than the budget currency.');
    case 'rate-kind-invalid':
      return t('Choose a one-day or standing rate.');
    case 'multicurrency-unavailable':
      return t('Multicurrency is not available for this budget.');
    default:
      return t('The rate could not be saved.');
  }
}

function describeResolution(
  resolution: RateResolution | null,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  if (resolution == null) return t('Loading…');
  if (resolution.status === 'error') return t('The rate could not be loaded.');
  if (resolution.status !== 'resolved') return t('No rate');
  const date = resolution.timestamp?.slice(0, 10) ?? '';
  const values = { rate: resolution.rate, date, source: resolution.source };
  if (resolution.kind === 'dated') {
    return t('one-day rate {{rate}} from {{date}}', values);
  }
  if (resolution.kind === 'standing') {
    return t('standing rate {{rate}} from {{date}}', values);
  }
  if (resolution.fallback) {
    return t(
      'fetched rate {{rate}} from {{date}} ({{source}}, latest available)',
      values,
    );
  }
  return t('fetched rate {{rate}} from {{date}} ({{source}})', values);
}

export function ExchangeRateSettings() {
  const { t } = useTranslation();
  const available = useMulticurrencyAvailable();
  const [baseCurrency] = useSyncedPref('defaultCurrencyCode');
  const currencyOptions = useCurrencyOptions();
  const [rows, setRows] = useState<RateRow[]>([]);
  const [version, setVersion] = useState(0);
  const [chosenQuote, setQuote] = useState('');
  const [today, setToday] = useState(utcToday);
  const [kind, setKind] = useState<ManualKind>('dated');
  const [date, setDate] = useState(utcToday);
  const [rate, setRate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{
    rate: string;
    kind: string;
  } | null>(null);
  const [entryResolution, setEntryResolution] = useState<RateResolution | null>(
    null,
  );
  const [estimateResolution, setEstimateResolution] =
    useState<RateResolution | null>(null);
  // Rows, the draft and save answers belong to one budget currency. When it
  // changes they are dropped, and a save still pending for the old one is
  // ignored.
  const [rowsBase, setRowsBase] = useState(baseCurrency);
  const currentBase = useRef(baseCurrency);
  useEffect(() => {
    currentBase.current = baseCurrency;
  }, [baseCurrency]);
  if (rowsBase !== baseCurrency) {
    setRowsBase(baseCurrency);
    setRows([]);
    setQuote('');
    setKind('dated');
    setDate(utcToday());
    setRate('');
    setError(null);
    setDuplicate(null);
  }

  const quoteOptions = currencyOptions.filter(
    ([code]) =>
      code !== '' && code !== baseCurrency && isReviewedCurrency(code),
  );
  // A choice that became the budget currency (or unreviewed) is cleared.
  const quote = quoteOptions.some(([code]) => code === chosenQuote)
    ? chosenQuote
    : '';

  // The one-day rate follows the UTC day while the screen stays open.
  useEffect(() => {
    const timer = setInterval(() => setToday(utcToday()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!baseCurrency) {
      setRows([]);
      return;
    }
    let cancelled = false;
    // Rows saved under an earlier budget currency stay out of this list:
    // save and remove address rows by the current budget currency.
    void aqlQuery(
      q('exchange_rates')
        .filter({ base_currency: baseCurrency })
        .select([
          'id',
          'base_currency',
          'quote_currency',
          'rate',
          'kind',
          'source',
          'timestamp',
        ]),
    ).then(({ data }: { data: RateRow[] }) => {
      if (cancelled) return;
      setRows(
        [...data].sort((a, b) => {
          if (a.quote_currency !== b.quote_currency) {
            return a.quote_currency < b.quote_currency ? -1 : 1;
          }
          return a.timestamp < b.timestamp ? 1 : -1;
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [baseCurrency, version]);

  useEffect(() => {
    const unlistenUndo = listen('undo-event', () => {
      setVersion(value => value + 1);
    });
    const unlistenSync = listen('sync-event', () => {
      setVersion(value => value + 1);
    });
    return () => {
      unlistenUndo();
      unlistenSync();
    };
  }, []);

  useEffect(() => {
    setEntryResolution(null);
    setEstimateResolution(null);
    if (!quote || !available || !baseCurrency) return;
    let cancelled = false;
    void Promise.all([
      send('exchange-rates/resolve', {
        quoteCurrency: quote,
        date: today,
        forEntry: true,
      }),
      send('exchange-rates/resolve', {
        quoteCurrency: quote,
        date: today,
        forEntry: false,
      }),
    ]).then(
      ([entry, estimate]) => {
        if (!cancelled) {
          setEntryResolution(entry);
          setEstimateResolution(estimate);
        }
      },
      () => {
        if (!cancelled) {
          setEntryResolution({ status: 'error' });
          setEstimateResolution({ status: 'error' });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [quote, available, baseCurrency, today, version]);

  if (!available || !baseCurrency) return null;

  function clearStatus() {
    setError(null);
    setDuplicate(null);
  }

  async function save(replace = false) {
    if (!quote || !date || rate.trim() === '') {
      setError(t('Choose a currency, a date, and a rate.'));
      setDuplicate(null);
      return;
    }
    setBusy(true);
    setError(null);
    const savedBase = baseCurrency;
    try {
      const result = await send('exchange-rates/save', {
        quoteCurrency: quote,
        rate,
        kind,
        date,
        replace,
      });
      if (currentBase.current !== savedBase) return;
      if (result.status === 'duplicate') {
        setDuplicate({
          rate: result.existing.rate,
          kind: result.existing.kind,
        });
        return;
      }
      setDuplicate(null);
      setRate('');
      setVersion(value => value + 1);
    } catch (caught) {
      if (currentBase.current === savedBase) setError(errorText(caught, t));
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: RateRow) {
    // The server finds the row under the current budget currency.
    if (row.kind === 'fetched' || row.base_currency !== baseCurrency) return;
    setBusy(true);
    setError(null);
    try {
      await send('exchange-rates/remove', {
        quoteCurrency: row.quote_currency,
        kind: row.kind,
        date: utcDay(row.timestamp),
      });
      setVersion(value => value + 1);
    } catch (caught) {
      setError(errorText(caught, t));
    } finally {
      setBusy(false);
    }
  }

  const currencyName = new Map(
    currencies.map(currency => [currency.code, currency.name]),
  );

  const rateLabel = quote
    ? t('{{quote}} per 1 {{base}}', { quote, base: baseCurrency })
    : t('Foreign units per 1 budget unit');

  return (
    <View data-testid="exchange-rates">
      <SettingsGroup
        title={t('Exchange rates')}
        description={t(
          'Save a one-day rate for transactions on that UTC day, or a standing rate that applies from its date when no fetched rate is available.',
        )}
      >
        <SettingsRow
          title={t('Currency')}
          htmlFor="exchange-rate-quote"
          control={
            <Select
              id="exchange-rate-quote"
              disabled={busy}
              value={quote}
              onChange={value => {
                setQuote(value);
                clearStatus();
              }}
              options={[['', t('Choose a currency')], ...quoteOptions]}
              style={{ maxWidth: '100%' }}
            />
          }
        />
        <SettingsRow
          title={t('Kind')}
          htmlFor="exchange-rate-kind"
          control={
            <Select
              id="exchange-rate-kind"
              disabled={busy}
              value={kind}
              onChange={value => {
                setKind(value as ManualKind);
                clearStatus();
              }}
              options={[
                ['dated', t('One-day rate')],
                ['standing', t('Standing rate')],
              ]}
              style={{ maxWidth: '100%' }}
            />
          }
        />
        <SettingsRow
          title={t('Date')}
          htmlFor="exchange-rate-date"
          control={
            <Input
              id="exchange-rate-date"
              type="date"
              disabled={busy}
              value={date}
              onChangeValue={value => {
                setDate(value);
                clearStatus();
              }}
            />
          }
        />
        <SettingsRow
          title={rateLabel}
          htmlFor="exchange-rate-value"
          control={
            <Input
              id="exchange-rate-value"
              value={rate}
              disabled={busy}
              inputMode="decimal"
              onChangeValue={value => {
                setRate(value);
                clearStatus();
              }}
            />
          }
        />
        <SettingsRow
          title={t('Rate in use today')}
          description={
            quote ? undefined : t('Choose a currency to see the rate it uses.')
          }
          control={
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {duplicate && (
                <Button
                  isDisabled={busy}
                  onPress={() => {
                    void save(true);
                  }}
                >
                  <Trans>Replace saved rate</Trans>
                </Button>
              )}
              <Button
                variant="primary"
                isDisabled={busy}
                onPress={() => {
                  void save(false);
                }}
              >
                <Trans>Save rate</Trans>
              </Button>
            </View>
          }
        >
          {quote && (
            <View style={{ gap: spacing.xxs }}>
              <Text
                data-testid="exchange-rate-entry-preview"
                style={styles.smallText}
              >
                <Trans>A new transaction today would use this rate:</Trans>{' '}
                {describeResolution(entryResolution, t)}
              </Text>
              <Text
                data-testid="exchange-rate-estimate-preview"
                style={styles.smallText}
              >
                <Trans>Estimates and To Budget would use this rate:</Trans>{' '}
                {describeResolution(estimateResolution, t)}
              </Text>
            </View>
          )}
          {duplicate && (
            <Text style={{ ...styles.smallText, color: theme.warningText }}>
              {duplicate.kind === 'standing'
                ? t(
                    'A standing rate of {{rate}} is already saved for this date.',
                    { rate: duplicate.rate },
                  )
                : t(
                    'A one-day rate of {{rate}} is already saved for this date.',
                    { rate: duplicate.rate },
                  )}
            </Text>
          )}
          {error && (
            <Text style={{ ...styles.smallText, color: theme.errorText }}>
              {error}
            </Text>
          )}
        </SettingsRow>
        <SettingsRow
          title={t('Saved rates')}
          description={
            rows.length === 0 ? t('No exchange rates saved yet.') : undefined
          }
        >
          {rows.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              {rows.map(row => (
                <View
                  key={row.id}
                  style={{
                    flexDirection: 'row',
                    gap: spacing.sm,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <Text style={{ ...styles.smallText, flex: 1 }}>
                    {row.quote_currency}
                    {currencyName.get(row.quote_currency)
                      ? ` (${currencyName.get(row.quote_currency)})`
                      : ''}
                    {': '}
                    {row.rate}{' '}
                    {row.kind === 'dated'
                      ? t('one-day')
                      : row.kind === 'standing'
                        ? t('standing')
                        : t('fetched')}{' '}
                    {utcDay(row.timestamp)}
                    {row.source !== 'manual' ? ` (${row.source})` : ''}
                  </Text>
                  {row.kind !== 'fetched' && (
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Button
                        isDisabled={busy}
                        onPress={() => {
                          if (
                            row.kind === 'fetched' ||
                            row.base_currency !== baseCurrency
                          ) {
                            return;
                          }
                          setQuote(row.quote_currency);
                          setKind(row.kind);
                          setDate(utcDay(row.timestamp));
                          setRate(row.rate);
                          clearStatus();
                        }}
                      >
                        <Trans>Edit</Trans>
                      </Button>
                      <Button
                        isDisabled={busy}
                        onPress={() => {
                          void remove(row);
                        }}
                      >
                        <Trans>Remove</Trans>
                      </Button>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </SettingsRow>
      </SettingsGroup>
    </View>
  );
}
