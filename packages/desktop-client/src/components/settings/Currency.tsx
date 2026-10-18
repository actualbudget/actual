import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { getCurrency } from '@actual-app/core/shared/currencies';
import {
  getCurrencyDisplaySymbol,
  parseDefaultCurrencySymbol,
} from '@actual-app/core/shared/fx/symbols';
import { q } from '@actual-app/core/shared/query';
import { css } from '@emotion/css';

import { useSetAccountsCurrencyMutation } from '#accounts';
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
import { useAccounts } from '#hooks/useAccounts';
import { useFormat } from '#hooks/useFormat';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { useQuery } from '#hooks/useQuery';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export function CurrencySettings() {
  const { t } = useTranslation();
  const { currencyOptions } = useCurrencyOptions();
  const displayModeOptions = useCurrencyDisplayModeOptions();
  const conversionRateModeOptions = useConversionRateModeOptions();
  const { isEnabled: isMultiCurrencyEnabled } = useMultiCurrency();
  const { data: accounts = [] } = useAccounts();
  const setAccountsCurrency = useSetAccountsCurrencyMutation();

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

  // A new default currency waiting for the user to decide what happens to
  // accounts that follow the default
  const [pendingCurrencyCode, setPendingCurrencyCode] = useState<string | null>(
    null,
  );
  // The accounts that follow the default currency and have transactions,
  // whose amounts changing it would relabel. Closed accounts count too: their
  // past amounts still show up in reports. Until the transactions are
  // loaded, every account that follows the default counts.
  const { data: implicitTransactionAccounts } = useQuery<{ account: string }>(
    () =>
      isMultiCurrencyEnabled
        ? q('transactions')
            .filter({ 'account.currency': null })
            .groupBy('account')
            .select('account')
        : null,
    [isMultiCurrencyEnabled],
  );
  const accountsToKeep = accounts.filter(
    account =>
      account.currency == null &&
      (implicitTransactionAccounts == null ||
        implicitTransactionAccounts.some(row => row.account === account.id)),
  );

  const selectButtonClassName = css({
    '&[data-hovered]': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  });

  const applyCurrencyChange = (code: string) => {
    setDefaultCurrencyCodePref(code);
    if (code !== '') {
      const cur = getCurrency(code);
      setNumberFormatPref(cur.numberFormat);
      setHideFractionPref(cur.decimalPlaces === 0 ? 'true' : 'false');
      // A currency code used as the symbol (e.g. "CHF 100") needs a space
      const isSpaceEnabled = !cur.symbolFirst || cur.symbol === cur.code;
      setSpaceEnabledPref(isSpaceEnabled ? 'true' : 'false');
      setSymbolPositionPref(cur.symbolFirst ? 'before' : 'after');
    }
  };

  const handleCurrencyChange = (code: string) => {
    if (
      isMultiCurrencyEnabled &&
      code !== selectedCurrencyCode &&
      accountsToKeep.length > 0
    ) {
      setPendingCurrencyCode(code);
      return;
    }
    applyCurrencyChange(code);
  };

  // The default only changes once the accounts are kept in the old one;
  // if that fails, an error is shown and nothing changes. Each save is undone
  // on its own, newest first: the default currency goes back before the
  // accounts do, so undoing never leaves them following the new default.
  const keepImplicitAccounts = (code: string) => {
    setAccountsCurrency.mutate(
      {
        ids: accountsToKeep.map(account => account.id),
        currency: selectedCurrencyCode,
      },
      {
        onSuccess: () => {
          applyCurrencyChange(code);
          setPendingCurrencyCode(null);
        },
      },
    );
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
            accountCount={accountsToKeep.length}
            isSaving={setAccountsCurrency.isPending}
            onKeep={() => keepImplicitAccounts(pendingCurrencyCode)}
            onSwitch={() => {
              applyCurrencyChange(pendingCurrencyCode);
              setPendingCurrencyCode(null);
            }}
            onCancel={() => setPendingCurrencyCode(null)}
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
  accountCount: number;
  isSaving: boolean;
  onKeep: () => void;
  onSwitch: () => void;
  onCancel: () => void;
};

function DefaultCurrencyChangeConfirmation({
  fromCode,
  toCode,
  accountCount,
  isSaving,
  onKeep,
  onSwitch,
  onCancel,
}: DefaultCurrencyChangeConfirmationProps) {
  const { t } = useTranslation();
  // Relabeling them is what changing the default currency has always done
  const canSwitch = toCode !== '';

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.warningText, lineHeight: 1.5 }}>
        {t(
          'Accounts with transactions that follow the default currency ({{from}}): {{count}}. Their amounts are not converted when the default changes.',
          { count: accountCount, from: fromCode },
        )}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button variant="primary" isDisabled={isSaving} onPress={onKeep}>
          {t('Keep them in {{from}}', { from: fromCode })}
        </Button>
        {canSwitch && (
          <Button isDisabled={isSaving} onPress={onSwitch}>
            {t('Relabel them as {{to}}', { to: toCode })}
          </Button>
        )}
        <Button variant="bare" isDisabled={isSaving} onPress={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      </View>
    </View>
  );
}
