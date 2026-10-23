import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Tab as AriaTab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { findRate } from '@actual-app/core/shared/fx/rates';
import * as monthUtils from '@actual-app/core/shared/months';
import type { ExchangeRateEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { DateSelect } from '#components/select/DateSelect';
import type { ContextMenuItem } from '#contextmenu/types';
import { useAccounts } from '#hooks/useAccounts';
import { useContextMenu } from '#hooks/useContextMenu';
import { useDateFormat } from '#hooks/useDateFormat';
import { useExchangeRates } from '#hooks/useExchangeRates';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import {
  ExchangeRatesTable,
  getErrorMessage,
  useDeleteRates,
} from './ExchangeRatesTable';
import { ImplicitCurrencyNudge } from './ImplicitCurrencyNudge';
import { formatRate, MAX_RATE, MIN_RATE, parseRate } from './rateFormat';
import { RatesUpdate } from './RatesUpdate';
import { useCurrencyOptions } from './useCurrencyOptions';

type CurrencyPair = { from: string; to: string };

const NEW_PAIR = 'new';

function getPairKey({ from, to }: CurrencyPair) {
  return `${from}>${to}`;
}

// The pairs that have rates, in the direction they were entered
function getPairs(
  exchangeRates: readonly ExchangeRateEntity[],
): CurrencyPair[] {
  const pairs = new Map<string, CurrencyPair>();
  for (const { from_currency, to_currency } of exchangeRates) {
    const pair = { from: from_currency, to: to_currency };
    pairs.set(getPairKey(pair), pair);
  }
  return [...pairs.values()].sort((a, b) =>
    getPairKey(a).localeCompare(getPairKey(b)),
  );
}

type Tab<Id extends string> = {
  id: Id;
  label: string;
  // Offered when the tab is right-clicked
  menuItems?: ContextMenuItem[];
};

type TabbedViewProps<Id extends string> = {
  'aria-label': string;
  tabs: ReadonlyArray<Tab<Id>>;
  selected: Id;
  onSelect: (id: Id) => void;
  // The content of the selected tab
  children: ReactNode;
};

// The content fills the height left under the tabs, like a View
const tabbedViewClassName = css({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  gap: 15,
});

// Accessible tabs: arrow keys move between them and screen readers announce
// the selected one and the panel it shows
function TabbedView<Id extends string>({
  'aria-label': ariaLabel,
  tabs,
  selected,
  onSelect,
  children,
}: TabbedViewProps<Id>) {
  return (
    <Tabs
      selectedKey={selected}
      onSelectionChange={key => onSelect(String(key) as Id)}
      className={tabbedViewClassName}
    >
      <TabList
        aria-label={ariaLabel}
        className={css({
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          flexShrink: 0,
          gap: 5,
          borderBottom: `1px solid ${theme.tableBorder}`,
        })}
      >
        {tabs.map(tab => (
          <TabItem key={tab.id} tab={tab} />
        ))}
      </TabList>
      {/* Only the selected tab's panel is shown. Keyed by it, so forms
          start over when another tab is opened. */}
      <TabPanel key={selected} id={selected} className={tabbedViewClassName}>
        {children}
      </TabPanel>
    </Tabs>
  );
}

function TabItem<Id extends string>({ tab }: { tab: Tab<Id> }) {
  const triggerRef = useRef<HTMLDivElement>(null);
  useContextMenu({
    triggerRef,
    enabled: (tab.menuItems?.length ?? 0) > 0,
    items: tab.menuItems ?? [],
  });

  return (
    <AriaTab
      id={tab.id}
      ref={triggerRef}
      className={({ isSelected, isFocusVisible }) =>
        css({
          padding: '5px 10px',
          cursor: 'pointer',
          color: theme.pageText,
          borderBottom: `2px solid ${isSelected ? theme.buttonPrimaryBackground : 'transparent'}`,
          fontWeight: isSelected ? 600 : 400,
          outline: 'none',
          borderRadius: 4,
          ...(isFocusVisible && {
            boxShadow: `0 0 0 2px ${theme.buttonPrimaryBackground}`,
          }),
          '&[data-hovered]': {
            backgroundColor: theme.buttonBareBackgroundHover,
          },
        })
      }
    >
      {tab.label}
    </AriaTab>
  );
}

export function ExchangeRates() {
  const { t } = useTranslation();
  const { isEnabled, defaultCurrencyCode, getAccountCurrency } =
    useMultiCurrency();
  const { exchangeRates, rateIndex } = useExchangeRates({
    enabled: isEnabled,
  });
  const { data: accounts = [] } = useAccounts();
  const [tab, setTab] = useState<'rates' | 'import'>('rates');
  const [selectedPairKey, setSelectedPairKey] = useState<string | null>(null);
  const dispatch = useDispatch();
  const deleteRates = useDeleteRates();

  // Deleting a whole series of rates is easy to do by mistake, so it is
  // confirmed first (and can still be undone)
  const confirmDeletePair = (pair: CurrencyPair) => {
    const ids = exchangeRates
      .filter(
        rate =>
          rate.from_currency === pair.from && rate.to_currency === pair.to,
      )
      .map(rate => rate.id);
    dispatch(
      pushModal({
        modal: {
          name: 'confirm-delete',
          options: {
            message: t(
              'Delete all {{count}} {{pair}} rates? Amounts converted with them will use other rates, or count 1:1 if there are none.',
              { count: ids.length, pair: `${pair.from} → ${pair.to}` },
            ),
            onConfirm: () => {
              void deleteRates(ids);
            },
          },
        },
      }),
    );
  };

  if (!isEnabled) {
    return (
      <Text style={{ color: theme.pageTextSubdued, lineHeight: 1.5 }}>
        <Trans>
          Turn on Multiple currencies in the experimental settings and choose a
          default currency to use exchange rates.
        </Trans>
      </Text>
    );
  }

  const missingCurrencies = [
    ...new Set(
      accounts
        .filter(account => !account.closed)
        .map(account => getAccountCurrency(account)),
    ),
  ].filter(code => findRate(rateIndex, code, defaultCurrencyCode) === null);

  const pairs = getPairs(exchangeRates);
  // The chosen pair, or the first one; none (the new pair tab) when it was
  // chosen explicitly or there are no rates yet
  const selectedPair =
    selectedPairKey === NEW_PAIR
      ? null
      : (pairs.find(pair => getPairKey(pair) === selectedPairKey) ??
        pairs[0] ??
        null);

  return (
    // Fills the page, and the rates table takes whatever height is left.
    // Everything above the table keeps its own height.
    <View style={{ gap: 15, paddingBottom: 20, flex: 1 }}>
      <Text style={{ color: theme.pageTextLight, lineHeight: 1.5 }}>
        <Trans>
          Exchange rates convert the balances of accounts in other currencies
          into the budget&apos;s default currency (
          {{ currency: defaultCurrencyCode }}). Enter what one unit of a
          currency is worth in another; the reverse direction is worked out for
          you. Each conversion uses the latest rate on or before the date it
          needs.
        </Trans>
      </Text>

      <View style={{ flexShrink: 0 }}>
        <ImplicitCurrencyNudge />
      </View>

      {missingCurrencies.length > 0 && (
        <Text style={{ color: theme.warningText, lineHeight: 1.5 }}>
          {t(
            'Accounts in {{currencies}} are counted 1:1 against {{currency}} until a rate is added. Get missing rates from Frankfurter adds the pair for you.',
            {
              currencies: missingCurrencies.join(', '),
              currency: defaultCurrencyCode,
            },
          )}
        </Text>
      )}

      <RatesUpdate />

      <TabbedView
        aria-label={t('Exchange Rates')}
        tabs={[
          { id: 'rates', label: t('Rates') },
          { id: 'import', label: t('Import and export') },
        ]}
        selected={tab}
        onSelect={setTab}
      >
        {tab === 'rates' ? (
          <TabbedView
            aria-label={t('Currency pairs')}
            tabs={[
              ...pairs.map(pair => ({
                id: getPairKey(pair),
                label: `${pair.from} → ${pair.to}`,
                menuItems: [
                  {
                    name: 'delete-pair',
                    text: t('Delete pair…'),
                    onClick: () => confirmDeletePair(pair),
                  },
                ],
              })),
              { id: NEW_PAIR, label: t('New pair') },
            ]}
            selected={selectedPair ? getPairKey(selectedPair) : NEW_PAIR}
            onSelect={setSelectedPairKey}
          >
            {selectedPair ? (
              <>
                <AddExchangeRateForm pair={selectedPair} />
                <ExchangeRatesTable
                  exchangeRates={exchangeRates.filter(
                    exchangeRate =>
                      exchangeRate.from_currency === selectedPair.from &&
                      exchangeRate.to_currency === selectedPair.to,
                  )}
                  onDeletePair={() => confirmDeletePair(selectedPair)}
                />
              </>
            ) : (
              <NewPairForm
                key={missingCurrencies[0] ?? 'none'}
                initialFrom={missingCurrencies[0] ?? ''}
                initialTo={defaultCurrencyCode}
                existingPairs={pairs}
                onAdded={pair => setSelectedPairKey(getPairKey(pair))}
              />
            )}
          </TabbedView>
        ) : (
          <>
            <ImportExchangeRates onViewRates={() => setTab('rates')} />
            <ExportExchangeRates hasRates={exchangeRates.length > 0} />
          </>
        )}
      </TabbedView>
    </View>
  );
}

type ImportResult = {
  added: number;
  updated: number;
  unchanged: number;
  errors: Array<{ line: number; message: string }>;
};

// Long files can have many bad rows; the rest are summed up
const MAX_LISTED_ERRORS = 10;

function getFileName(filepath: string) {
  return filepath.split(/[\\/]/).pop() ?? filepath;
}

function ImportExchangeRates({ onViewRates }: { onViewRates: () => void }) {
  const { t } = useTranslation();
  const [result, setResult] = useState<
    (ImportResult & { fileName: string }) | null
  >(null);
  const [importingFile, setImportingFile] = useState<string | null>(null);

  const chooseFile = async () => {
    const files = await window.Actual.openFileDialog({
      filters: [{ name: t('CSV files'), extensions: ['csv', 'tsv', 'txt'] }],
    });
    if (!files || files.length === 0) {
      return;
    }

    const fileName = getFileName(files[0]);
    setResult(null);
    setImportingFile(fileName);
    try {
      const importResult = await send('exchange-rates-import', {
        filepath: files[0],
      });
      setResult({ ...importResult, fileName });
    } catch {
      setResult({
        added: 0,
        updated: 0,
        unchanged: 0,
        errors: [
          { line: 0, message: t('Something went wrong while importing.') },
        ],
        fileName,
      });
    } finally {
      setImportingFile(null);
    }
  };

  const savedCount = result ? result.added + result.updated : 0;

  return (
    <View style={{ gap: 10, flexShrink: 0 }}>
      <Text style={{ lineHeight: 1.5 }}>
        <Trans>
          Import many rates at once from a CSV file. The first row must name the
          columns date, from, to and rate, in any order. Dates use the
          YYYY-MM-DD format, and values may be separated by commas, semicolons
          or tabs. Rates use a dot as the decimal mark, or a comma when values
          are separated by semicolons or tabs, and no thousands separators. A
          rate for a pair of currencies and a date that already exists is
          replaced.
        </Trans>
      </Text>
      <pre
        style={{
          margin: 0,
          padding: 10,
          borderRadius: 6,
          backgroundColor: theme.tableBackground,
          border: `1px solid ${theme.tableBorder}`,
          fontSize: 12,
        }}
      >
        {
          'date,from,to,rate\n2026-10-01,USD,CAD,1.3862\n2026-10-01,CAD,COP,3000'
        }
      </pre>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Button
          variant="primary"
          isDisabled={importingFile !== null}
          onPress={() => void chooseFile()}
        >
          <Trans>Choose a CSV file…</Trans>
        </Button>
        {importingFile !== null && (
          <Text style={{ color: theme.pageTextSubdued }}>
            {t('Importing {{fileName}}…', { fileName: importingFile })}
          </Text>
        )}
      </View>
      {result && (
        <View
          style={{
            gap: 5,
            padding: 15,
            borderRadius: 6,
            border: `1px solid ${theme.tableBorder}`,
            backgroundColor: theme.tableBackground,
          }}
        >
          <Text
            style={{
              fontWeight: 600,
              color:
                result.errors.length > 0 ? theme.warningText : theme.noticeText,
            }}
          >
            {result.errors.length === 0
              ? t('{{fileName}} was imported.', { fileName: result.fileName })
              : savedCount + result.unchanged > 0
                ? t('{{fileName}} was imported, but some rows were skipped.', {
                    fileName: result.fileName,
                  })
                : t('{{fileName}} could not be imported.', {
                    fileName: result.fileName,
                  })}
          </Text>
          {savedCount + result.unchanged > 0 && (
            <Text>
              {t(
                'New rates: {{added}}. Updated rates: {{updated}}. Already up to date: {{unchanged}}.',
                {
                  added: result.added,
                  updated: result.updated,
                  unchanged: result.unchanged,
                },
              )}
            </Text>
          )}
          {result.errors.slice(0, MAX_LISTED_ERRORS).map(error => (
            <FormError key={`${error.line}-${error.message}`}>
              {error.line > 0
                ? t('Line {{line}}: {{message}}', {
                    line: error.line,
                    message: error.message,
                  })
                : error.message}
            </FormError>
          ))}
          {result.errors.length > MAX_LISTED_ERRORS && (
            <FormError>
              {t('…and {{count}} more rows with errors.', {
                count: result.errors.length - MAX_LISTED_ERRORS,
              })}
            </FormError>
          )}
          {savedCount + result.unchanged > 0 && (
            <View style={{ flexDirection: 'row', marginTop: 5 }}>
              <Button onPress={onViewRates}>
                <Trans>View rates</Trans>
              </Button>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function ExportExchangeRates({ hasRates }: { hasRates: boolean }) {
  const { t } = useTranslation();

  const [error, setError] = useState<string | null>(null);

  const exportRates = async () => {
    setError(null);
    try {
      const csv = await send('exchange-rates-export');
      await window.Actual.saveFile(
        csv,
        'exchange-rates.csv',
        t('Export exchange rates'),
      );
    } catch {
      setError(t('Something went wrong while exporting the rates.'));
    }
  };

  return (
    <View style={{ gap: 10, marginTop: 10, flexShrink: 0 }}>
      <Text style={{ lineHeight: 1.5 }}>
        <Trans>
          Export all rates to a CSV file in the same format, for example to move
          them to another budget.
        </Trans>
      </Text>
      <View style={{ flexDirection: 'row' }}>
        <Button isDisabled={!hasRates} onPress={() => void exportRates()}>
          <Trans>Export rates</Trans>
        </Button>
      </View>
      {error && <FormError>{error}</FormError>}
    </View>
  );
}

type AddExchangeRateFormProps = {
  pair: CurrencyPair;
};

// Adds rates to an existing pair; its currencies can't be changed here
function AddExchangeRateForm({ pair }: AddExchangeRateFormProps) {
  const { t } = useTranslation();

  return (
    <RateForm
      title={t('Add a rate')}
      renderFrom={() => <Text style={{ fontWeight: 600 }}>{pair.from}</Text>}
      renderTo={() => <Text style={{ fontWeight: 600 }}>{pair.to}</Text>}
      getPair={() => ({ pair })}
    />
  );
}

type NewPairFormProps = {
  initialFrom: string;
  initialTo: string;
  existingPairs: readonly CurrencyPair[];
  onAdded: (pair: CurrencyPair) => void;
};

// Starts a new pair with its first rate
function NewPairForm({
  initialFrom,
  initialTo,
  existingPairs,
  onAdded,
}: NewPairFormProps) {
  const { t } = useTranslation();
  const { currencyOptions } = useCurrencyOptions();
  const options = currencyOptions.filter(([code]) => code !== '');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const getPair = (): { pair: CurrencyPair } | { error: string } => {
    if (from === '' || to === '') {
      return { error: t('Choose both currencies.') };
    }
    if (from === to) {
      return { error: t('Choose two different currencies.') };
    }
    // A pair has a single tab, in the direction it was first entered
    const existing = existingPairs.find(
      pair =>
        (pair.from === from && pair.to === to) ||
        (pair.from === to && pair.to === from),
    );
    if (existing) {
      return {
        error: t(
          'Rates between {{from}} and {{to}} are already in the {{pair}} tab.',
          { from, to, pair: `${existing.from} → ${existing.to}` },
        ),
      };
    }
    return { pair: { from, to } };
  };

  return (
    <RateForm
      title={t('Add a currency pair')}
      renderFrom={() => (
        <Select
          value={from}
          defaultLabel={t('Currency')}
          onChange={setFrom}
          options={options}
          style={{ maxWidth: 260 }}
        />
      )}
      renderTo={() => (
        <Select
          value={to}
          defaultLabel={t('Currency')}
          onChange={setTo}
          options={options}
          style={{ maxWidth: 260 }}
        />
      )}
      getPair={getPair}
      onAdded={onAdded}
    />
  );
}

type RateFormProps = {
  title: string;
  renderFrom: () => ReactNode;
  renderTo: () => ReactNode;
  getPair: () => { pair: CurrencyPair } | { error: string };
  onAdded?: (pair: CurrencyPair) => void;
};

function RateForm({
  title,
  renderFrom,
  renderTo,
  getPair,
  onAdded,
}: RateFormProps) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [date, setDate] = useState(monthUtils.currentDay());
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    const result = getPair();
    if ('error' in result) {
      setError(result.error);
      return;
    }
    const parsedRate = parseRate(rate);
    if (parsedRate === null) {
      setError(
        t('The rate must be a number from {{min}} to {{max}}.', {
          min: formatRate(MIN_RATE),
          max: formatRate(MAX_RATE),
        }),
      );
      return;
    }
    try {
      await send('exchange-rate-create', {
        from_currency: result.pair.from,
        to_currency: result.pair.to,
        rate: parsedRate,
        date,
      });
      setRate('');
      setError(null);
      onAdded?.(result.pair);
    } catch (e) {
      setError(
        getErrorMessage(e) ?? t('The exchange rate could not be saved.'),
      );
    }
  };

  return (
    <View
      style={{
        gap: 8,
        padding: 15,
        flexShrink: 0,
        borderRadius: 6,
        border: `1px solid ${theme.tableBorder}`,
        backgroundColor: theme.tableBackground,
      }}
    >
      <Text style={{ fontWeight: 600 }}>{title}</Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <DateSelect
          value={date}
          dateFormat={dateFormat}
          // Typed dates count as soon as they are complete, so pressing
          // Enter in the rate field adds the rate on the date shown
          onUpdate={setDate}
          onSelect={setDate}
          inputProps={{ 'aria-label': t('Date'), style: { width: 150 } }}
        />
        <Text>1</Text>
        {renderFrom()}
        <Text>=</Text>
        <Input
          aria-label={t('Rate')}
          inputMode="decimal"
          placeholder={t('Rate')}
          value={rate}
          onChangeValue={setRate}
          onEnter={() => void add()}
          style={{ width: 120 }}
        />
        {renderTo()}
        <Button variant="primary" onPress={() => void add()}>
          <Trans>Add</Trans>
        </Button>
      </View>
      {error && <FormError>{error}</FormError>}
    </View>
  );
}
