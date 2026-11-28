import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { getCurrency } from '@actual-app/core/shared/currencies';
import {
  EVERY_CURRENCY,
  getOwnLineStart,
  parseOwnLines,
} from '@actual-app/core/shared/fx/ownLines';
import {
  getCurrencyDisplaySymbol,
  parseDefaultCurrencySymbol,
} from '@actual-app/core/shared/fx/symbols';
import { isWebAddress } from '@actual-app/core/shared/fx/webAddress';
import * as monthUtils from '@actual-app/core/shared/months';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import { css } from '@emotion/css';

import {
  DEFAULT_CURRENCY_DISPLAY_MODE,
  parseConversionRateMode,
  parseCurrencyDisplayMode,
  useConversionRateModeOptions,
  useCurrencyDisplayModeOptions,
} from '#components/currency/displayMode';
import { ImplicitCurrencyNudge } from '#components/currency/ImplicitCurrencyNudge';
import { useCurrencyOptions } from '#components/currency/useCurrencyOptions';
import { Checkbox } from '#components/forms';
import { useOwnLineCurrencies } from '#hooks/useCategoryCurrencies';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useUpdateExchangeRates } from '#hooks/useUpdateExchangeRates';
import { pushModal } from '#modals/modalsSlice';
import { loadPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

// How amounts of a currency are written, saved along with it as the default
function getCurrencyFormat(code: string) {
  const cur = getCurrency(code);
  // A currency code used as the symbol (e.g. "CHF 100") needs a space
  const isSpaceEnabled = !cur.symbolFirst || cur.symbol === cur.code;
  return {
    numberFormat: cur.numberFormat,
    hideFraction: cur.decimalPlaces === 0 ? 'true' : 'false',
    currencySpaceBetweenAmountAndSymbol: isSpaceEnabled ? 'true' : 'false',
    currencySymbolPosition: cur.symbolFirst ? 'before' : 'after',
  } satisfies SyncedPrefs;
}

export function CurrencySettings() {
  const { t } = useTranslation();
  const { currencyOptions } = useCurrencyOptions();
  const displayModeOptions = useCurrencyDisplayModeOptions();
  const conversionRateModeOptions = useConversionRateModeOptions();
  const dispatch = useDispatch();
  const { isEnabled: isMultiCurrencyEnabled } = useMultiCurrency();
  // Also before a default currency is chosen
  const isCurrencyFlagOn = useFeatureFlag('currency');
  const isMultiCurrencyFlagOn = useFeatureFlag('multiCurrency');
  const { starts: ownLineStarts } = useOwnLineCurrencies();
  const [ownLinesPref] = useSyncedPref('currency-own-lines');
  // The first month ('YYYY-MM', null for every month) from which the
  // default currency, once it no longer is, is budgeted on its own, or
  // undefined when it isn't: its budgets then move to lines in it from that
  // month rather than being converted
  const getOnItsOwnFrom = (from: string, to: string) => {
    const starts = parseOwnLines(ownLinesPref);
    starts.delete(to);
    const start = getOwnLineStart(starts, from);
    if (start == null) {
      return undefined;
    }
    const text = String(start);
    return start === 0 ? null : `${text.slice(0, 4)}-${text.slice(4, 6)}`;
  };

  const [defaultCurrencyCode, setDefaultCurrencyCodePref] = useSyncedPref(
    'defaultCurrencyCode',
  );
  const selectedCurrencyCode = defaultCurrencyCode || '';
  // 100.00 the way amounts of the default currency are shown, e.g. 100 in a
  // currency without decimals
  const exampleAmount = useFormat().forEdit(10000);

  const [symbolPosition, setSymbolPositionPref] = useSyncedPref(
    'currencySymbolPosition',
  );
  const [spaceEnabled, setSpaceEnabledPref] = useSyncedPref(
    'currencySpaceBetweenAmountAndSymbol',
  );
  const [, setNumberFormatPref] = useSyncedPref('numberFormat');
  const [, setHideFractionPref] = useSyncedPref('hideFraction');
  const [displayModePref, setDisplayModePref] = useSyncedPref(
    'currency-display-mode',
  );
  const [defaultSymbolPref, setDefaultSymbolPref] = useSyncedPref(
    'currency-default-symbol',
  );
  const [conversionRatePref, setConversionRatePref] = useSyncedPref(
    'currency-conversion-rate',
  );
  const [autoUpdatePref, setAutoUpdatePref] = useSyncedPref(
    'exchange-rates-auto-update',
  );
  const updateRates = useUpdateExchangeRates();
  const [providerUrlPref, setProviderUrlPref] = useSyncedPref(
    'exchange-rates-provider-url',
  );
  const [providerUrlError, setProviderUrlError] = useState<string | null>(null);

  // A new default currency waiting for the user to confirm the change
  const [pendingCurrencyCode, setPendingCurrencyCode] = useState<string | null>(
    null,
  );
  const [isChangingDefault, setIsChangingDefault] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const selectButtonClassName = css({
    '&[data-hovered]': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  });

  // Without multiple currencies the default only changes how amounts are
  // written
  const applyCurrencyChange = (code: string) => {
    setDefaultCurrencyCodePref(code);
    if (code !== '') {
      const format = getCurrencyFormat(code);
      setNumberFormatPref(format.numberFormat);
      setHideFractionPref(format.hideFraction);
      setSpaceEnabledPref(format.currencySpaceBetweenAmountAndSymbol);
      setSymbolPositionPref(format.currencySymbolPosition);
    }
  };

  // With multiple currencies, accounts and budgets keep the currency they
  // were recorded in, and accounts without one get it explicitly; one change
  // that one undo brings back
  const changeDefaultCurrency = async (code: string) => {
    setIsChangingDefault(true);
    setChangeError(null);
    try {
      await send('currency-default-change', {
        currency: code,
        format: getCurrencyFormat(code),
      });
      // Saved by the server, so the preferences, and the number format with
      // them, are read again
      await dispatch(loadPrefs());
      setPendingCurrencyCode(null);
    } catch {
      setChangeError(t('The default currency could not be changed.'));
    } finally {
      setIsChangingDefault(false);
    }
  };

  const handleCurrencyChange = (code: string) => {
    if (code === selectedCurrencyCode) {
      return;
    }
    if (isCurrencyFlagOn && isMultiCurrencyFlagOn && code !== '') {
      if (isMultiCurrencyEnabled) {
        setPendingCurrencyCode(code);
      } else {
        // The first default: accounts take it as their own
        void changeDefaultCurrency(code);
      }
      return;
    }
    applyCurrencyChange(code);
  };

  const symbolPositionOptions = useMemo(() => {
    const selectedCurrency = getCurrency(selectedCurrencyCode);
    // The position also applies to other currencies, so the preview shows
    // a symbol even when the default currency has none
    const symbol =
      (isMultiCurrencyEnabled
        ? getCurrencyDisplaySymbol(selectedCurrencyCode, {
            defaultCurrencyCode: selectedCurrencyCode,
            defaultSymbol:
              parseDefaultCurrencySymbol(defaultSymbolPref) === 'code'
                ? 'code'
                : 'symbol',
          })
        : selectedCurrency.symbol) || '$';
    const space = spaceEnabled === 'true' ? ' ' : '';

    return [
      {
        value: 'before',
        label: `${t('Before amount')} (${t('e.g.')} ${symbol}${space}100)`,
      },
      {
        value: 'after',
        label: `${t('After amount')} (${t('e.g.')} 100${space}${symbol})`,
      },
    ];
  }, [
    selectedCurrencyCode,
    spaceEnabled,
    isMultiCurrencyEnabled,
    defaultSymbolPref,
    t,
  ]);

  return (
    <SettingsGroup
      title={t('Currency')}
      description={t(
        'Currency settings affect how amounts are displayed throughout the application. Changing the currency also updates the number format, symbol position and whether decimal places are shown. These can be adjusted after the currency is set.',
      )}
    >
      <SettingsRow
        title={t('Default currency')}
        control={
          <Select
            value={selectedCurrencyCode}
            onChange={handleCurrencyChange}
            options={currencyOptions}
            className={selectButtonClassName}
            style={{ maxWidth: '100%' }}
          />
        }
      >
        {pendingCurrencyCode !== null && (
          <DefaultCurrencyChangeConfirmation
            fromCode={selectedCurrencyCode}
            toCode={pendingCurrencyCode}
            onItsOwnFrom={getOnItsOwnFrom(
              selectedCurrencyCode,
              pendingCurrencyCode,
            )}
            isSaving={isChangingDefault}
            error={changeError}
            onConfirm={() => void changeDefaultCurrency(pendingCurrencyCode)}
            onCancel={() => {
              setPendingCurrencyCode(null);
              setChangeError(null);
            }}
          />
        )}
      </SettingsRow>
      {selectedCurrencyCode !== '' && (
        <SettingsRow
          title={t('Symbol position')}
          control={
            <Select
              value={symbolPosition || 'before'}
              onChange={value => setSymbolPositionPref(value)}
              options={symbolPositionOptions.map(f => [f.value, f.label])}
              className={selectButtonClassName}
              style={{ maxWidth: '100%' }}
            />
          }
        />
      )}
      {selectedCurrencyCode !== '' && (
        <SettingsRow
          htmlFor="settings-spaceEnabled"
          title={t('Add space between amount and symbol')}
          control={
            <Checkbox
              id="settings-spaceEnabled"
              checked={spaceEnabled === 'true'}
              onChange={e =>
                setSpaceEnabledPref(e.target.checked ? 'true' : 'false')
              }
              style={{ marginRight: 0 }}
            />
          }
        />
      )}
      {isMultiCurrencyEnabled && (
        <SettingsRow
          title={t('Show balances of other currencies as')}
          description={t(
            'How the balance of an account in another currency is shown: in its header, its running balance and its chart. Transactions always show their own amount; hover over one to see it in the default currency. Each account can override this in its settings.',
          )}
          control={
            <Select
              value={
                parseCurrencyDisplayMode(displayModePref) ??
                DEFAULT_CURRENCY_DISPLAY_MODE
              }
              onChange={setDisplayModePref}
              options={displayModeOptions}
              className={selectButtonClassName}
              style={{ maxWidth: '100%' }}
            />
          }
        >
          <ImplicitCurrencyNudge />
        </SettingsRow>
      )}
      {isMultiCurrencyEnabled && (
        <SettingsRow
          title={t('Convert past amounts with')}
          description={t(
            "Which rate converts past amounts in reports, the balance chart, running balances and the value shown when hovering over a transaction. Current balances always use the latest rate, and the budget always uses the rate on each transaction's date.",
          )}
          control={
            <Select
              value={parseConversionRateMode(conversionRatePref)}
              onChange={setConversionRatePref}
              options={conversionRateModeOptions}
              className={selectButtonClassName}
              style={{ maxWidth: '100%' }}
            />
          }
        >
          {parseConversionRateMode(conversionRatePref) === 'historical' && (
            <Text style={{ color: theme.warningText, lineHeight: 1.5 }}>
              <Trans>
                Results are only accurate when there is an exchange rate on or
                before every transaction date. Amounts dated before your
                earliest rate use a later one instead and are marked with ≈.
              </Trans>
            </Text>
          )}
        </SettingsRow>
      )}
      {isMultiCurrencyEnabled && (
        <SettingsRow
          title={t('Budget currencies on their own')}
          description={t(
            "Spending in a chosen currency gets a line of its own in its category, budgeted and kept in that currency. Spending in other currencies is converted into its category's budget. Also in the budget's menu.",
          )}
          control={
            <Button
              onPress={() =>
                dispatch(pushModal({ modal: { name: 'currency-own-lines' } }))
              }
            >
              <Trans>Change</Trans>
            </Button>
          }
        >
          <Text style={{ color: theme.pageTextLight }}>
            {ownLineStarts.has(EVERY_CURRENCY)
              ? t('Every currency')
              : ownLineStarts.size > 0
                ? [...ownLineStarts.keys()].sort().join(', ')
                : t('None: spending in other currencies is converted')}
          </Text>
        </SettingsRow>
      )}
      {isMultiCurrencyEnabled && (
        <SettingsRow
          htmlFor="settings-exchangeRatesAutoUpdate"
          title={t('Update exchange rates automatically')}
          description={t(
            'Once a day, fetches the rates your currencies are missing from Frankfurter, which publishes the reference rates of central banks. Only currency codes and dates are sent; your budget never leaves your device. Rates you enter yourself always win.',
          )}
          control={
            <Checkbox
              id="settings-exchangeRatesAutoUpdate"
              checked={autoUpdatePref === 'true'}
              onChange={e => {
                setAutoUpdatePref(e.target.checked ? 'true' : 'false');
                // Right away rather than at the next sync, so the rates show
                // up while the user is looking
                if (e.target.checked) {
                  void updateRates();
                }
              }}
              style={{ marginRight: 0 }}
            />
          }
        >
          {/* Also used by the Update now buttons, so shown either way */}
          <View style={{ gap: 5 }}>
            <Text style={{ color: theme.pageTextLight }}>
              <Trans>
                Server address, to use your own Frankfurter server instead of
                the public one (optional):
              </Trans>
            </Text>
            <Input
              aria-label={t('Frankfurter server address')}
              aria-invalid={providerUrlError !== null}
              aria-describedby={
                providerUrlError
                  ? 'settings-exchangeRatesProviderUrl-error'
                  : undefined
              }
              defaultValue={providerUrlPref ?? ''}
              placeholder="https://api.frankfurter.dev"
              onUpdate={value => {
                const url = value.trim();
                if (url !== '' && !isWebAddress(url)) {
                  setProviderUrlError(
                    t('Enter an address that starts with https:// or http://.'),
                  );
                  return;
                }
                setProviderUrlError(null);
                if (url !== (providerUrlPref ?? '')) {
                  setProviderUrlPref(url);
                }
              }}
              style={{ maxWidth: 400 }}
            />
            {providerUrlError && (
              <Text
                id="settings-exchangeRatesProviderUrl-error"
                style={{ color: theme.errorText }}
              >
                {providerUrlError}
              </Text>
            )}
          </View>
        </SettingsRow>
      )}
      {isMultiCurrencyEnabled && (
        <SettingsRow
          title={t('Symbol for {{currency}} amounts', {
            currency: selectedCurrencyCode,
          })}
          description={t(
            'Amounts in other currencies always show their code, e.g. USD$100.00, so they can be told apart from {{currency}} amounts.',
            { currency: selectedCurrencyCode },
          )}
          control={
            <Select
              value={parseDefaultCurrencySymbol(defaultSymbolPref)}
              onChange={setDefaultSymbolPref}
              options={[
                [
                  'none',
                  t('No symbol, e.g. {{example}}', { example: exampleAmount }),
                ],
                [
                  'symbol',
                  t('Symbol, e.g. {{example}}', {
                    example: `${getCurrencyDisplaySymbol(selectedCurrencyCode, {
                      defaultCurrencyCode: selectedCurrencyCode,
                      defaultSymbol: 'symbol',
                    })}${exampleAmount}`,
                  }),
                ],
                [
                  'code',
                  t('Code and symbol, e.g. {{example}}', {
                    example: `${getCurrencyDisplaySymbol(selectedCurrencyCode, {
                      defaultCurrencyCode: selectedCurrencyCode,
                      defaultSymbol: 'code',
                    })}${exampleAmount}`,
                  }),
                ],
              ]}
              className={selectButtonClassName}
              style={{ maxWidth: '100%' }}
            />
          }
        />
      )}
    </SettingsGroup>
  );
}

type DefaultCurrencyChangeConfirmationProps = {
  fromCode: string;
  toCode: string;
  // From which month ('YYYY-MM', null for every month) the old default is
  // budgeted on its own after the change; undefined when it isn't
  onItsOwnFrom: string | null | undefined;
  isSaving: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// Says what changing the default currency does with multiple currencies on:
// accounts and transactions keep their currency, and budgets in the old
// default follow the currencies budgeted on their own
function DefaultCurrencyChangeConfirmation({
  fromCode,
  toCode,
  onItsOwnFrom,
  isSaving,
  error,
  onConfirm,
  onCancel,
}: DefaultCurrencyChangeConfirmationProps) {
  const { t } = useTranslation();
  const locale = useLocale();

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.warningText, lineHeight: 1.5 }}>
        {onItsOwnFrom
          ? t(
              "Accounts keep their currency and their transactions are never converted, so those in {{from}} stay in {{from}}. {{from}} is budgeted on its own from {{month}}: from then on, budgets in {{from}} move to {{from}} lines and stay in {{from}}. Earlier months become {{to}} budgets, converted at each month's rate, with spending in {{from}} converted into its category like any other currency there. {{to}} lines become the categories' own budgets, and amounts held for next month are converted too. Budget templates in notes keep their amounts, which then count in {{to}}.",
              {
                from: fromCode,
                to: toCode,
                month: monthUtils.format(onItsOwnFrom, 'MMMM yyyy', locale),
              },
            )
          : onItsOwnFrom === null
            ? t(
                "Accounts keep their currency and their transactions are never converted, so those in {{from}} stay in {{from}}. {{from}} is budgeted on its own, so budgets in {{from}} move to {{from}} lines and stay in {{from}}, and {{to}} lines become the categories' own budgets. Only amounts held for next month are converted to {{to}}, as To Budget is in the default currency. Budget templates in notes keep their amounts, which then count in {{to}}.",
                { from: fromCode, to: toCode },
              )
            : t(
                "Accounts keep their currency and their transactions are never converted, so those in {{from}} stay in {{from}}. Budgets become {{to}} budgets: amounts budgeted in {{from}} are converted at each month's rate, so each month keeps its value, and spending in {{from}} is converted into its category like any other currency not budgeted on its own. {{to}} lines become the categories' own budgets, and amounts held for next month are converted too. Budget templates in notes keep their amounts, which then count in {{to}}.",
                { from: fromCode, to: toCode },
              )}
      </Text>
      {error && <Text style={{ color: theme.errorText }}>{error}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button variant="primary" isDisabled={isSaving} onPress={onConfirm}>
          {t('Change to {{to}}', { to: toCode })}
        </Button>
        <Button variant="bare" isDisabled={isSaving} onPress={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      </View>
    </View>
  );
}
