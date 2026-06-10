import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgArrowRight } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { currencies, getCurrency } from '@actual-app/core/shared/currencies';
import { currentDay } from '@actual-app/core/shared/months';
import { format as formatDateTime, isValid, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { FiltersButton } from '#components/filters/FiltersButton';
import { Page } from '#components/Page';
import { DateTimeSelect } from '#components/select/DateTimeSelect';
import { useDateFormat } from '#hooks/useDateFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import {
  getMissingExchangeRate,
  openMissingExchangeRateModal,
} from '#util/missingExchangeRate';

type EnabledCurrency = {
  id: string;
  code: string;
  name?: string | null;
  is_base?: boolean;
};

type ExchangeRate = {
  id: string;
  from_currency: string;
  to_currency: string;
  date: string;
  rate: string;
  source?: string | null;
  transaction_count?: number;
};

const allCurrencyOptions: [string, string][] = currencies
  .filter(currency => currency.code !== '')
  .map(currency => [currency.code, `${currency.code} - ${currency.name}`]);

function normalizeFilterDateTime(value: string, endOfDay = false) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00'}`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return normalizeFilterDateTime(trimmed.replace(' ', 'T'), endOfDay);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

function formatExchangeRateDateTime(value: string, dateFormat: string) {
  const parsed = parseISO(value);
  if (!isValid(parsed)) {
    return value;
  }

  return formatDateTime(parsed, `${dateFormat} HH:mm`);
}

export function ExchangeRatesPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [defaultCurrencyCode] = useSyncedPref('defaultCurrencyCode');
  const [lastToCurrency, setLastToCurrency] = useSyncedPref(
    'exchange-rate-last-to-currency',
  );
  const initialCurrencyCode = defaultCurrencyCode || 'USD';

  const [enabledCurrencies, setEnabledCurrencies] = useState<EnabledCurrency[]>(
    [],
  );
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [newCurrencyCode, setNewCurrencyCode] = useState(initialCurrencyCode);
  const [rateFromCurrency, setRateFromCurrency] = useState(initialCurrencyCode);
  const [rateToCurrency, setRateToCurrency] = useState(initialCurrencyCode);
  const [rateDate, setRateDate] = useState(currentDay());
  const [rate, setRate] = useState('');
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState('');
  const [filterFromCurrency, setFilterFromCurrency] = useState('');
  const [filterToCurrency, setFilterToCurrency] = useState('');
  const [filterCombinationA, setFilterCombinationA] = useState('');
  const [filterCombinationB, setFilterCombinationB] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSetBaseOpen, setIsSetBaseOpen] = useState(false);
  const [isChangeBaseOpen, setIsChangeBaseOpen] = useState(false);
  const setBaseTriggerRef = useRef(null);
  const changeBaseTriggerRef = useRef(null);
  const filtersTriggerRef = useRef(null);

  const baseCurrency = enabledCurrencies.find(currency => currency.is_base);
  const baseCurrencyCode = baseCurrency?.code || '';
  const defaultRateFromCurrency =
    baseCurrencyCode || enabledCurrencies[0]?.code || '';
  const availableCurrencyOptions = useMemo(
    () =>
      allCurrencyOptions.filter(
        ([code]) => !enabledCurrencies.some(currency => currency.code === code),
      ),
    [enabledCurrencies],
  );
  const enabledCurrencyOptions: [string, string][] = enabledCurrencies.map(
    currency => [currency.code, `${currency.code} - ${currency.name}`],
  );
  const toCurrencyOptions = enabledCurrencyOptions.filter(
    ([code]) => code !== rateFromCurrency,
  );

  const getDefaultToCurrency = useCallback(
    (fromCurrency: string) => {
      if (
        lastToCurrency &&
        lastToCurrency !== fromCurrency &&
        enabledCurrencies.some(currency => currency.code === lastToCurrency)
      ) {
        return lastToCurrency;
      }

      return (
        enabledCurrencies.find(currency => currency.code !== fromCurrency)
          ?.code ?? ''
      );
    },
    [enabledCurrencies, lastToCurrency],
  );

  const refreshCurrencyData = async () => {
    const [currencyRows, rateRows] = await Promise.all([
      send('currencies-get'),
      send('exchange-rates-get'),
    ]);
    setEnabledCurrencies(currencyRows as EnabledCurrency[]);
    setExchangeRates(rateRows as ExchangeRate[]);
  };

  useEffect(() => {
    void refreshCurrencyData();
  }, []);

  useEffect(() => {
    const defaultNewCurrency =
      availableCurrencyOptions.find(
        ([code]) => code === defaultCurrencyCode,
      )?.[0] ??
      availableCurrencyOptions[0]?.[0] ??
      '';
    setNewCurrencyCode(defaultNewCurrency);
    setRateFromCurrency(defaultRateFromCurrency);
    setRateToCurrency(getDefaultToCurrency(defaultRateFromCurrency));
  }, [
    availableCurrencyOptions,
    baseCurrencyCode,
    defaultCurrencyCode,
    defaultRateFromCurrency,
    enabledCurrencies,
    getDefaultToCurrency,
    lastToCurrency,
  ]);

  const showError = (message: string, error: unknown) => {
    dispatch(
      addNotification({
        notification: {
          id: uuidv4(),
          type: 'error',
          message,
          pre: error instanceof Error ? error.message : undefined,
        },
      }),
    );
  };

  const onEnableCurrency = async () => {
    setIsSavingCurrency(true);
    try {
      const currency = getCurrency(newCurrencyCode);
      await send('currency-create', {
        code: currency.code,
        name: currency.name,
      });
      await refreshCurrencyData();
    } catch (error) {
      showError(t('There was an error enabling the currency.'), error);
    } finally {
      setIsSavingCurrency(false);
    }
  };

  const onCreateRate = async () => {
    const normalizedRate = rate.trim();
    if (rateFromCurrency === rateToCurrency) {
      showError(t('Exchange rate currencies must be different.'), null);
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(normalizedRate) || Number(normalizedRate) <= 0) {
      showError(t('Exchange rate must be a positive number.'), null);
      return;
    }

    setIsSavingRate(true);
    try {
      await send('exchange-rate-create', {
        fromCurrency: rateFromCurrency,
        toCurrency: rateToCurrency,
        date: rateDate,
        rate: normalizedRate,
      });
      setRate('');
      setLastToCurrency(rateToCurrency);
      await refreshCurrencyData();
    } catch (error) {
      showError(t('There was an error saving the exchange rate.'), error);
    } finally {
      setIsSavingRate(false);
    }
  };

  const updateRate = async (
    exchangeRate: ExchangeRate,
    recalculateTransactions: boolean,
  ) => {
    const normalizedRate = editingRate.trim();
    if (!/^\d+(\.\d+)?$/.test(normalizedRate) || Number(normalizedRate) <= 0) {
      showError(t('Exchange rate must be a positive number.'), null);
      return;
    }

    try {
      await send('exchange-rate-update', {
        id: exchangeRate.id,
        rate: normalizedRate,
        recalculateTransactions,
      });
      setEditingRateId(null);
      setEditingRate('');
      await refreshCurrencyData();
    } catch (error) {
      showError(t('There was an error updating the exchange rate.'), error);
    }
  };

  const onSaveEditRate = (exchangeRate: ExchangeRate) => {
    const transactionCount = exchangeRate.transaction_count ?? 0;
    if (transactionCount > 0) {
      dispatch(
        pushModal({
          modal: {
            name: 'confirm-exchange-rate-edit',
            options: {
              transactionCount,
              onConfirm: () => updateRate(exchangeRate, true),
            },
          },
        }),
      );
      return;
    }

    void updateRate(exchangeRate, false);
  };

  const onDeleteRate = async (exchangeRate: ExchangeRate) => {
    try {
      await send('exchange-rate-delete', { id: exchangeRate.id });
      await refreshCurrencyData();
    } catch (error) {
      showError(t('There was an error deleting the exchange rate.'), error);
    }
  };

  const setBaseCurrency = async (code: string) => {
    try {
      await send('currency-set-base', { code });
      await refreshCurrencyData();
    } catch (error) {
      showError(t('There was an error setting the base currency.'), error);
    }
  };

  const changeBaseCurrency = async (code: string) => {
    try {
      await send('currency-change-base', { code });
      await refreshCurrencyData();
    } catch (error) {
      const missingRate = getMissingExchangeRate(error);
      if (missingRate) {
        openMissingExchangeRateModal({
          dispatch,
          t,
          missingRate,
          onSaved: () => changeBaseCurrency(code),
        });
        return;
      }

      showError(t('There was an error changing the base currency.'), error);
    }
  };

  const disableCurrency = async (code: string) => {
    try {
      await send('currency-disable', { code });
      await refreshCurrencyData();
    } catch (error) {
      showError(t('There was an error disabling the currency.'), error);
    }
  };

  const confirmBaseCurrency = (code: string, mode: 'set' | 'change') => {
    dispatch(
      pushModal({
        modal: {
          name: 'confirm-base-currency',
          options: {
            code,
            mode,
            onConfirm: () =>
              mode === 'set' ? setBaseCurrency(code) : changeBaseCurrency(code),
          },
        },
      }),
    );
  };

  const confirmDisableCurrency = (code: string) => {
    if (!baseCurrencyCode) {
      showError(t('Set a base currency before disabling currencies.'), null);
      return;
    }

    dispatch(
      pushModal({
        modal: {
          name: 'confirm-disable-currency',
          options: {
            code,
            baseCurrency: baseCurrencyCode,
            onConfirm: () => disableCurrency(code),
          },
        },
      }),
    );
  };

  const gridColumns = isNarrowWidth ? '1fr' : 'minmax(220px, 280px) 1fr';
  const canSaveRate =
    enabledCurrencyOptions.length > 1 &&
    rateFromCurrency !== '' &&
    rateToCurrency !== '' &&
    rateFromCurrency !== rateToCurrency;
  const filterCurrencyOptions: [string, string][] = [
    ['', t('All')],
    ...enabledCurrencyOptions,
  ];
  const filteredExchangeRates = exchangeRates.filter(exchangeRate => {
    if (
      filterFromCurrency &&
      exchangeRate.from_currency !== filterFromCurrency
    ) {
      return false;
    }
    if (filterToCurrency && exchangeRate.to_currency !== filterToCurrency) {
      return false;
    }
    if (filterCombinationA && filterCombinationB) {
      const currencies = [exchangeRate.from_currency, exchangeRate.to_currency];
      if (
        !currencies.includes(filterCombinationA) ||
        !currencies.includes(filterCombinationB)
      ) {
        return false;
      }
    }
    if (
      filterDate &&
      (/^\d{4}-\d{2}-\d{2}$/.test(filterDate.trim())
        ? !exchangeRate.date.startsWith(filterDate.trim())
        : exchangeRate.date !== normalizeFilterDateTime(filterDate))
    ) {
      return false;
    }
    if (
      filterDateFrom &&
      exchangeRate.date < normalizeFilterDateTime(filterDateFrom)
    ) {
      return false;
    }
    if (
      filterDateTo &&
      exchangeRate.date > normalizeFilterDateTime(filterDateTo, true)
    ) {
      return false;
    }
    return true;
  });
  const activeFilterCount = [
    filterFromCurrency,
    filterToCurrency,
    filterCombinationA,
    filterCombinationB,
    filterDate,
    filterDateFrom,
    filterDateTo,
  ].filter(Boolean).length;

  return (
    <Page header={t('Exchange Rates')}>
      <View
        style={{
          maxWidth: 980,
          width: '100%',
          gap: 16,
          paddingBottom: 30,
        }}
      >
        <View
          style={{
            display: 'grid',
            gridTemplateColumns: gridColumns,
            gap: 16,
            alignItems: 'start',
          }}
        >
          <View
            style={{
              border: `1px solid ${theme.tableBorder}`,
              borderRadius: 6,
              padding: 12,
              gap: 12,
              backgroundColor: theme.tableBackground,
            }}
          >
            <Text style={{ fontWeight: 600 }}>
              <Trans>Enabled currencies</Trans>
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Select
                value={newCurrencyCode}
                onChange={setNewCurrencyCode}
                options={availableCurrencyOptions}
                style={{ flex: 1 }}
              />
              <ButtonWithLoading
                variant="primary"
                isLoading={isSavingCurrency}
                isDisabled={isSavingCurrency || !newCurrencyCode}
                onPress={onEnableCurrency}
              >
                <Trans>Enable</Trans>
              </ButtonWithLoading>
            </View>
            <View style={{ gap: 4 }}>
              {enabledCurrencies.map(currency => (
                <View
                  key={currency.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Text>{currency.code}</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text style={{ color: theme.pageTextLight }}>
                      {currency.is_base ? t('Base currency') : currency.name}
                    </Text>
                    {baseCurrencyCode && !currency.is_base && (
                      <Button
                        style={{ padding: '3px 8px' }}
                        onPress={() => confirmDisableCurrency(currency.code)}
                      >
                        <Trans>Disable</Trans>
                      </Button>
                    )}
                  </View>
                </View>
              ))}
            </View>
            {!baseCurrency ? (
              <View>
                <Button
                  ref={setBaseTriggerRef}
                  variant="primary"
                  onPress={() => setIsSetBaseOpen(true)}
                  isDisabled={enabledCurrencies.length === 0}
                >
                  <Trans>Set base currency</Trans>
                </Button>
                <Popover
                  triggerRef={setBaseTriggerRef}
                  isOpen={isSetBaseOpen}
                  placement="bottom start"
                  onOpenChange={() => setIsSetBaseOpen(false)}
                >
                  <Menu
                    items={enabledCurrencies.map(currency => ({
                      name: currency.code,
                      text: `${currency.code} - ${currency.name ?? currency.code}`,
                    }))}
                    onMenuSelect={code => {
                      setIsSetBaseOpen(false);
                      confirmBaseCurrency(String(code), 'set');
                    }}
                  />
                </Popover>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.pageTextLight }}>
                  {t('Current base currency: {{code}}', {
                    code: baseCurrency.code,
                  })}
                </Text>
                <View>
                  <Button
                    ref={changeBaseTriggerRef}
                    onPress={() => setIsChangeBaseOpen(true)}
                    isDisabled={enabledCurrencies.length < 2}
                  >
                    <Trans>Change base currency</Trans>
                  </Button>
                  <Popover
                    triggerRef={changeBaseTriggerRef}
                    isOpen={isChangeBaseOpen}
                    placement="bottom start"
                    onOpenChange={() => setIsChangeBaseOpen(false)}
                  >
                    <Menu
                      items={enabledCurrencies
                        .filter(currency => currency.code !== baseCurrency.code)
                        .map(currency => ({
                          name: currency.code,
                          text: `${currency.code} - ${currency.name ?? currency.code}`,
                        }))}
                      onMenuSelect={code => {
                        setIsChangeBaseOpen(false);
                        confirmBaseCurrency(String(code), 'change');
                      }}
                    />
                  </Popover>
                </View>
              </View>
            )}
          </View>

          <View
            style={{
              border: `1px solid ${theme.tableBorder}`,
              borderRadius: 6,
              padding: 12,
              gap: 12,
              backgroundColor: theme.tableBackground,
            }}
          >
            <Text style={{ fontWeight: 600 }}>
              <Trans>Add exchange rate</Trans>
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  flex: isNarrowWidth ? '1 1 100%' : '1 1 460px',
                  minWidth: isNarrowWidth ? '100%' : 460,
                }}
              >
                <Select
                  value={rateFromCurrency}
                  onChange={value => {
                    setRateFromCurrency(value);
                    if (value === rateToCurrency) {
                      setRateToCurrency(getDefaultToCurrency(value));
                    }
                  }}
                  options={enabledCurrencyOptions}
                  style={{ flex: 1, minWidth: 0 }}
                  popoverStyle={{ minWidth: 240 }}
                />
                <SvgArrowRight
                  style={{
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    color: theme.pageTextLight,
                  }}
                />
                <Select
                  value={rateToCurrency}
                  onChange={setRateToCurrency}
                  options={toCurrencyOptions}
                  style={{ flex: 1, minWidth: 0 }}
                  popoverStyle={{ minWidth: 240 }}
                />
              </View>
              <DateTimeSelect
                value={rateDate}
                onChangeValue={setRateDate}
                isRequired
              />
              <Input
                inputMode="decimal"
                value={rate}
                onChangeValue={setRate}
                placeholder="1.2345"
                style={{ width: 160 }}
              />
              <ButtonWithLoading
                variant="primary"
                isLoading={isSavingRate}
                isDisabled={isSavingRate || !canSaveRate}
                onPress={onCreateRate}
              >
                <Trans>Save</Trans>
              </ButtonWithLoading>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View ref={filtersTriggerRef}>
            <FiltersButton onPress={() => setIsFiltersOpen(true)} />
          </View>
          {activeFilterCount > 0 && (
            <Text style={{ color: theme.pageTextLight }}>
              {t('{{count}} active', { count: activeFilterCount })}
            </Text>
          )}
          <Popover
            triggerRef={filtersTriggerRef}
            isOpen={isFiltersOpen}
            placement="bottom start"
            onOpenChange={() => setIsFiltersOpen(false)}
          >
            <View
              style={{
                width: isNarrowWidth ? 300 : 560,
                padding: 12,
                gap: 10,
                backgroundColor: theme.menuBackground,
              }}
            >
              <Text style={{ fontWeight: 600 }}>
                <Trans>Filter exchange rates</Trans>
              </Text>
              <View
                style={{
                  display: 'grid',
                  gridTemplateColumns: isNarrowWidth ? '1fr' : '1fr 1fr',
                  gap: 10,
                }}
              >
                <View style={{ gap: 4 }}>
                  <Text style={{ color: theme.pageTextLight }}>
                    <Trans>From</Trans>
                  </Text>
                  <Select
                    value={filterFromCurrency}
                    onChange={setFilterFromCurrency}
                    options={filterCurrencyOptions}
                  />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: theme.pageTextLight }}>
                    <Trans>To</Trans>
                  </Text>
                  <Select
                    value={filterToCurrency}
                    onChange={setFilterToCurrency}
                    options={filterCurrencyOptions}
                  />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: theme.pageTextLight }}>
                    <Trans>Combination A</Trans>
                  </Text>
                  <Select
                    value={filterCombinationA}
                    onChange={setFilterCombinationA}
                    options={filterCurrencyOptions}
                  />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: theme.pageTextLight }}>
                    <Trans>Combination B</Trans>
                  </Text>
                  <Select
                    value={filterCombinationB}
                    onChange={setFilterCombinationB}
                    options={filterCurrencyOptions}
                  />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: theme.pageTextLight }}>
                    <Trans>Date/time</Trans>
                  </Text>
                  <DateTimeSelect
                    value={filterDate}
                    onChangeValue={setFilterDate}
                  />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: theme.pageTextLight }}>
                    <Trans>From date/time</Trans>
                  </Text>
                  <DateTimeSelect
                    value={filterDateFrom}
                    onChangeValue={setFilterDateFrom}
                  />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: theme.pageTextLight }}>
                    <Trans>To date/time</Trans>
                  </Text>
                  <DateTimeSelect
                    value={filterDateTo}
                    onChangeValue={setFilterDateTo}
                  />
                </View>
              </View>
              <View
                style={{ flexDirection: 'row', justifyContent: 'flex-end' }}
              >
                <Button
                  onPress={() => {
                    setFilterFromCurrency('');
                    setFilterToCurrency('');
                    setFilterCombinationA('');
                    setFilterCombinationB('');
                    setFilterDate('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                >
                  <Trans>Clear filters</Trans>
                </Button>
              </View>
            </View>
          </Popover>
        </View>

        <View
          style={{
            border: `1px solid ${theme.tableBorder}`,
            borderRadius: 6,
            overflow: 'hidden',
            backgroundColor: theme.tableBackground,
          }}
        >
          <View
            style={{
              display: 'grid',
              gridTemplateColumns: isNarrowWidth
                ? '1fr 1fr'
                : '170px 140px 140px 1fr 140px 120px 180px',
              gap: 8,
              padding: '9px 12px',
              backgroundColor: theme.tableHeaderBackground,
              color: theme.pageTextLight,
              fontWeight: 600,
            }}
          >
            <Text>
              <Trans>Date/time</Trans>
            </Text>
            <Text>
              <Trans>From</Trans>
            </Text>
            {!isNarrowWidth && (
              <>
                <Text>
                  <Trans>To</Trans>
                </Text>
                <Text>
                  <Trans>Rate</Trans>
                </Text>
                <Text>
                  <Trans>Source</Trans>
                </Text>
                <Text>
                  <Trans>Used</Trans>
                </Text>
                <Text>
                  <Trans>Actions</Trans>
                </Text>
              </>
            )}
          </View>
          {filteredExchangeRates.length === 0 ? (
            <Text style={{ padding: 12, color: theme.pageTextLight }}>
              <Trans>No exchange rates saved yet.</Trans>
            </Text>
          ) : (
            filteredExchangeRates.map(exchangeRate => (
              <View
                key={exchangeRate.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isNarrowWidth
                    ? '1fr 1fr'
                    : '170px 140px 140px 1fr 140px 120px 180px',
                  gap: 8,
                  padding: '9px 12px',
                  borderTop: `1px solid ${theme.tableBorder}`,
                }}
              >
                <Text>
                  {formatExchangeRateDateTime(exchangeRate.date, dateFormat)}
                </Text>
                <Text>
                  {exchangeRate.from_currency}
                  {isNarrowWidth
                    ? ` -> ${exchangeRate.to_currency}: ${exchangeRate.rate}`
                    : ''}
                </Text>
                {!isNarrowWidth && (
                  <>
                    <Text>{exchangeRate.to_currency}</Text>
                    {editingRateId === exchangeRate.id ? (
                      <Input
                        inputMode="decimal"
                        value={editingRate}
                        onChangeValue={setEditingRate}
                      />
                    ) : (
                      <Text>{exchangeRate.rate}</Text>
                    )}
                    <Text>{exchangeRate.source || t('Manual')}</Text>
                    <Text>{exchangeRate.transaction_count ?? 0}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {editingRateId === exchangeRate.id ? (
                        <>
                          <Button onPress={() => onSaveEditRate(exchangeRate)}>
                            <Trans>Save</Trans>
                          </Button>
                          <Button
                            onPress={() => {
                              setEditingRateId(null);
                              setEditingRate('');
                            }}
                          >
                            <Trans>Cancel</Trans>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onPress={() => {
                              setEditingRateId(exchangeRate.id);
                              setEditingRate(exchangeRate.rate);
                            }}
                          >
                            <Trans>Edit</Trans>
                          </Button>
                          <Button
                            isDisabled={
                              (exchangeRate.transaction_count ?? 0) > 0
                            }
                            onPress={() => onDeleteRate(exchangeRate)}
                          >
                            <Trans>Delete</Trans>
                          </Button>
                        </>
                      )}
                    </View>
                  </>
                )}
              </View>
            ))
          )}
        </View>
      </View>
    </Page>
  );
}
