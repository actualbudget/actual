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
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  HistoryFilter,
  HistoryRow,
} from '@actual-app/core/types/models/exchange-rate-history';

import {
  RateField,
  rateInDirection,
  storedRate,
} from '#components/transactions/RateField';
import type { RateDirection } from '#components/transactions/RateField';
import { useFxProviderContext } from '#hooks/useFxProviderContext';
import { useMulticurrencyAvailable } from '#hooks/useMulticurrencyAvailable';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { rateSourceName } from '#util/rate-source';

import { useCurrencyOptions } from './Currency';
import { ExchangeRateHistory } from './ExchangeRateHistory';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

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
    case 'multicurrency-unavailable':
      return t('Multicurrency is not available for this budget.');
    default:
      return t('The rate could not be saved.');
  }
}

function describeResolution(
  resolution: RateResolution | null,
  direction: RateDirection,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  if (resolution == null) return t('Loading…');
  if (resolution.status === 'error') return t('The rate could not be loaded.');
  if (resolution.status !== 'resolved') return t('No rate');
  const date = resolution.timestamp?.slice(0, 10) ?? '';
  const values = {
    rate: rateInDirection(resolution.rate, direction) ?? '',
    date,
    source: rateSourceName(resolution.source),
  };
  if (resolution.kind === 'dated') {
    return t('manual fallback {{rate}} for {{date}}', values);
  }
  if (resolution.fallback) {
    return t(
      'fetched rate {{rate}} from {{date}} ({{source}}, latest available)',
      values,
    );
  }
  return t('fetched rate {{rate}} from {{date}} ({{source}})', values);
}

function historyFilter(quote: string): HistoryFilter {
  return quote ? { quoteCurrency: quote } : {};
}

export function ExchangeRateSettings() {
  const { t } = useTranslation();
  const available = useMulticurrencyAvailable();
  const fx = useFxProviderContext();
  const fxRef = useRef(fx);
  fxRef.current = fx;
  const [baseCurrency] = useSyncedPref('defaultCurrencyCode');
  const currencyOptions = useCurrencyOptions();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [version, setVersion] = useState(0);
  const [chosenQuote, setQuote] = useState('');
  const [quoteFilter, setQuoteFilter] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unpageableCount, setUnpageableCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [listLoaded, setListLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const listGeneration = useRef(0);
  const listMounted = useRef(true);
  const pageRequest = useRef<{
    generation: number;
    cursor: string | null;
    accepted: boolean;
  } | null>(null);
  const [today, setToday] = useState(monthUtils.currentDay);
  const [date, setDate] = useState(monthUtils.currentDay);
  const [rate, setRate] = useState('');
  const [direction, setDirection] = useState<RateDirection>('base-per-foreign');
  const [originalRate, setOriginalRate] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ rate: string } | null>(null);
  const [resolution, setResolution] = useState<RateResolution | null>(null);
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
    setQuoteFilter('');
    setDate(monthUtils.currentDay());
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

  // Today follows the local day while the screen stays open.
  useEffect(() => {
    const timer = setInterval(() => setToday(monthUtils.currentDay()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!available || !baseCurrency) return;
    const generation = ++listGeneration.current;
    const filter = historyFilter(quoteFilter);
    pageRequest.current = { generation, cursor: null, accepted: false };
    setRows([]);
    setNextCursor(null);
    setUnpageableCount(0);
    setInvalidCount(0);
    setListLoaded(false);
    setListError(null);
    let stopped = false;
    void (async () => {
      const result = await send('exchange-rates/history-page', filter);
      if (
        stopped ||
        !listMounted.current ||
        !acceptHistoryPage(generation, null)
      ) {
        return;
      }
      if (result.status !== 'ok') return;
      fxRef.current.observe(result.context);
      if (fxRef.current.current() !== result.context) return;
      pageRequest.current = { generation, cursor: null, accepted: true };
      setRows(result.rows);
      setNextCursor(result.nextCursor);
      setUnpageableCount(result.unpageableCount ?? 0);
      setInvalidCount(result.invalidCount);
      setListLoaded(true);
    })();
    return () => {
      stopped = true;
      listGeneration.current += 1;
      pageRequest.current = null;
    };
  }, [available, baseCurrency, quoteFilter, version, fx.epoch]);

  useEffect(() => {
    listMounted.current = true;
    return () => {
      listMounted.current = false;
      listGeneration.current += 1;
      pageRequest.current = null;
    };
  }, []);

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
    setResolution(null);
    if (!quote || !available || !baseCurrency) return;
    let cancelled = false;
    void send('exchange-rates/resolve', {
      quoteCurrency: quote,
      date: today,
    }).then(
      result => {
        if (!cancelled) setResolution(result);
      },
      () => {
        if (!cancelled) setResolution({ status: 'error' });
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
        rate: originalRate ?? storedRate(rate, direction),
        date,
        replace,
      });
      if (currentBase.current !== savedBase) return;
      if (result.status === 'duplicate') {
        setDuplicate({ rate: result.existing.rate });
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

  function acceptHistoryPage(generation: number, cursor: string | null) {
    const request = pageRequest.current;
    return (
      request !== null &&
      request.generation === generation &&
      request.cursor === cursor &&
      !request.accepted
    );
  }

  async function loadMore() {
    const cursor = nextCursor;
    if (!cursor) return;
    const generation = listGeneration.current;
    const filter = historyFilter(quoteFilter);
    pageRequest.current = { generation, cursor, accepted: false };
    const result = await send(
      'exchange-rates/history-page',
      cursor ? { ...filter, cursor } : filter,
    );
    if (
      !listMounted.current ||
      !acceptHistoryPage(generation, cursor) ||
      result.status !== 'ok'
    ) {
      return;
    }
    fxRef.current.observe(result.context);
    if (fxRef.current.current() !== result.context) return;
    pageRequest.current = { generation, cursor, accepted: true };
    setRows(current => [...current, ...result.rows]);
    setNextCursor(result.nextCursor);
    setInvalidCount(current => current + result.invalidCount);
    setListLoaded(true);
  }

  async function remove(row: HistoryRow) {
    setBusy(true);
    setError(null);
    setListError(null);
    try {
      if (row.kind === 'fetched') {
        const context = fxRef.current.current();
        if (!context) return;
        const result = await send('exchange-rates/remove-fetched', {
          id: row.id,
          context,
          reviewed: {
            rate: row.rate,
            source: row.source,
            timestamp: row.timestamp,
          },
        });
        if (result.status === 'removed') {
          setVersion(value => value + 1);
        } else if (result.status === 'stale') {
          setListError(
            t(
              'This rate changed after it was listed. Review the list and try again.',
            ),
          );
        } else if (result.status === 'missing') {
          setListError(t('This rate is no longer in the list.'));
        }
        return;
      }
      if (row.kind !== 'dated') return;
      await send('exchange-rates/remove', {
        quoteCurrency: row.quote_currency,
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

  return (
    <View data-testid="exchange-rates">
      <SettingsGroup
        title={t('Exchange rates')}
        description={t(
          'A fallback rate applies to its day only. A fetched rate for that day comes first; a fallback comes before an earlier fetched rate.',
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
          title={t('Rate:')}
          htmlFor="exchange-rate-value"
          control={
            <RateField
              id="exchange-rate-value"
              name="exchange-rate-value"
              currencyCode={quote}
              value={rate}
              disabled={busy}
              direction={direction}
              resolvedRate={originalRate}
              onChange={(value, nextDirection, edited) => {
                setRate(value);
                setDirection(nextDirection);
                if (edited !== false) setOriginalRate(undefined);
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
                <Trans>Save fallback</Trans>
              </Button>
            </View>
          }
        >
          {quote && (
            <Text data-testid="exchange-rate-preview" style={styles.smallText}>
              <Trans>New transactions and valuations today use:</Trans>{' '}
              {describeResolution(resolution, direction, t)}
            </Text>
          )}
          {duplicate && (
            <Text style={{ ...styles.smallText, color: theme.warningText }}>
              {t(
                'A fallback of {{rate}} {{base}} per 1 {{foreign}} is already saved for this date.',
                {
                  rate: Number((1 / Number(duplicate.rate)).toPrecision(15)),
                  base: baseCurrency,
                  foreign: quote,
                },
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
          htmlFor="exchange-rate-filter-quote"
          description={
            listLoaded && rows.length === 0
              ? t('No exchange rates saved yet.')
              : undefined
          }
          control={
            <Select
              id="exchange-rate-filter-quote"
              value={quoteFilter}
              onChange={value => {
                setQuoteFilter(value);
              }}
              options={[['', t('All currencies')], ...quoteOptions]}
              style={{ maxWidth: '100%' }}
            />
          }
        >
          {unpageableCount > 0 && (
            <Text style={styles.smallText}>
              {t(
                'Saved rates that cannot be listed because their stored values cannot be read: {{count}}.',
                { count: unpageableCount },
              )}
            </Text>
          )}
          {invalidCount > 0 && (
            <Text style={styles.smallText}>
              {t('Invalid saved rates left out of the list: {{count}}.', {
                count: invalidCount,
              })}
            </Text>
          )}
          {listError && (
            <Text style={{ ...styles.smallText, color: theme.errorText }}>
              {listError}
            </Text>
          )}
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
                    {row.kind === 'dated' ? t('fallback') : t('fetched')}{' '}
                    {utcDay(row.timestamp)}
                    {row.source !== 'manual'
                      ? ` (${rateSourceName(row.source)})`
                      : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {row.kind === 'dated' && (
                      <Button
                        isDisabled={busy}
                        onPress={() => {
                          setQuote(row.quote_currency);
                          setDate(utcDay(row.timestamp));
                          setRate(rateInDirection(row.rate, direction) ?? '');
                          setOriginalRate(row.rate);
                          clearStatus();
                        }}
                      >
                        <Trans>Edit</Trans>
                      </Button>
                    )}
                    <Button
                      isDisabled={busy}
                      onPress={() => {
                        void remove(row);
                      }}
                    >
                      <Trans>Remove</Trans>
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          )}
          {nextCursor && (
            <Button
              onPress={() => {
                void loadMore();
              }}
            >
              <Trans>Load more</Trans>
            </Button>
          )}
        </SettingsRow>
        <ExchangeRateHistory
          fx={fx}
          filter={historyFilter(quoteFilter)}
          onRatesChanged={() => {
            setVersion(value => value + 1);
          }}
        />
      </SettingsGroup>
    </View>
  );
}
