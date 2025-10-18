import React, { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  currencies,
  getCurrency,
  getCurrencySymbol,
} from 'loot-core/shared/currencies';

import { Column, Setting } from './UI';

import { Checkbox } from '@desktop-client/components/forms';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function CurrencySettings() {
  const { t } = useTranslation();

  const currencyTranslations = useMemo(
    () =>
      new Map<string, string>([
        ['', t('None')],
        ['AED', t('UAE Dirham')],
        ['ARS', t('Argentinian Peso')],
        ['AUD', t('Australian Dollar')],
        ['BRL', t('Brazilian Real')],
        ['CAD', t('Canadian Dollar')],
        ['CHF', t('Swiss Franc')],
        ['CNY', t('Yuan Renminbi')],
        ['CRC', t('Costa Rican Colón')],
        ['EGP', t('Egyptian Pound')],
        ['EUR', t('Euro')],
        ['GBP', t('Pound Sterling')],
        ['HKD', t('Hong Kong Dollar')],
        ['INR', t('Indian Rupee')],
        ['JMD', t('Jamaican Dollar')],
        // ['JPY', t('Japanese Yen')],
        ['LKR', t('Sri Lankan Rupee')],
        ['MDL', t('Moldovan Leu')],
        ['PHP', t('Philippine Peso')],
        ['PLN', t('Polish Złoty')],
        ['QAR', t('Qatari Riyal')],
        ['RON', t('Romanian Leu')],
        ['RSD', t('Serbian Dinar')],
        ['RUB', t('Russian Ruble')],
        ['SAR', t('Saudi Riyal')],
        ['SEK', t('Swedish Krona')],
        ['SGD', t('Singapore Dollar')],
        ['THB', t('Thai Baht')],
        ['TRY', t('Turkish Lira')],
        ['UAH', t('Ukrainian Hryvnia')],
        ['USD', t('US Dollar')],
        ['UZS', t('Uzbek Soum')],
      ]),
    [t],
  );

  const [defaultCurrencyCode, setDefaultCurrencyCodePref] = useSyncedPref(
    'defaultCurrencyCode',
  );
  const selectedCurrencyCode = defaultCurrencyCode || '';

  const [symbolPosition, setSymbolPositionPref] = useSyncedPref(
    'currencySymbolPosition',
  );
  const [spaceEnabled, setSpaceEnabledPref] = useSyncedPref(
    'currencySpaceBetweenAmountAndSymbol',
  );
  const [symbolVariant, setSymbolVariantPref] = useSyncedPref(
    `currencySymbolVariant-${selectedCurrencyCode}` as const,
  );
  const [, setNumberFormatPref] = useSyncedPref('numberFormat');
  const [, setHideFractionPref] = useSyncedPref('hideFraction');

  const selectButtonClassName = css({
    '&[data-hovered]': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  });

  const currencyOptions: [string, string][] = currencies.map(currency => {
    const translatedName =
      currencyTranslations.get(currency.code) ?? currency.name;
    if (currency.code === '') {
      return [currency.code, translatedName];
    }
    // For the dropdown, we can't easily show the selected variant for each currency
    // since we'd need to read multiple preferences. Just show the default symbol.
    const symbol = getCurrencySymbol(currency);
    return [currency.code, `${currency.code} - ${translatedName} (${symbol})`];
  });

  const handleCurrencyChange = (code: string) => {
    setDefaultCurrencyCodePref(code);
    if (code !== '') {
      const cur = getCurrency(code);
      setNumberFormatPref(cur.numberFormat);
      setHideFractionPref(cur.decimalPlaces === 0 ? 'true' : 'false');
      setSpaceEnabledPref(cur.symbolFirst ? 'false' : 'true');
      setSymbolPositionPref(cur.symbolFirst ? 'before' : 'after');
    }
  };

  const symbolPositionOptions = useMemo(() => {
    const selectedCurrency = getCurrency(selectedCurrencyCode);
    const symbolVariantIndex = symbolVariant
      ? parseInt(symbolVariant, 10)
      : undefined;
    const symbol =
      getCurrencySymbol(selectedCurrency, symbolVariantIndex) || '$';
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
  }, [selectedCurrencyCode, spaceEnabled, symbolVariant, t]);

  return (
    <Setting
      primaryAction={
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5em',
            width: '100%',
          }}
        >
          <View style={{ display: 'flex', flexDirection: 'row', gap: '1.5em' }}>
            <Column title={t('Default Currency')}>
              <Select
                value={selectedCurrencyCode}
                onChange={handleCurrencyChange}
                options={currencyOptions}
                className={selectButtonClassName}
                style={{ width: '100%' }}
              />
            </Column>

            <Column
              title={t('Symbol Position')}
              style={{
                visibility: selectedCurrencyCode === '' ? 'hidden' : 'visible',
              }}
            >
              <Select
                value={symbolPosition || 'before'}
                onChange={value => setSymbolPositionPref(value)}
                options={symbolPositionOptions.map(f => [f.value, f.label])}
                className={selectButtonClassName}
                style={{ width: '100%' }}
                disabled={selectedCurrencyCode === ''}
              />
            </Column>
          </View>

          {selectedCurrencyCode !== '' && (
            <>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                <Checkbox
                  id="settings-spaceEnabled"
                  checked={spaceEnabled === 'true'}
                  onChange={e =>
                    setSpaceEnabledPref(e.target.checked ? 'true' : 'false')
                  }
                />
                <label
                  htmlFor="settings-spaceEnabled"
                  style={{ marginLeft: '0.5em' }}
                >
                  <Trans>Add space between amount and symbol</Trans>
                </label>
              </View>

              {(() => {
                const selectedCurrency = getCurrency(selectedCurrencyCode);
                if (selectedCurrency.symbols.length > 1) {
                  const currentVariantIndex = symbolVariant
                    ? parseInt(symbolVariant, 10)
                    : selectedCurrency.defaultSymbolIndex;

                  return (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5em',
                      }}
                    >
                      <Text style={{ fontWeight: 'bold' }}>
                        <Trans>Symbol Variant</Trans>
                      </Text>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          gap: '1em',
                        }}
                      >
                        {selectedCurrency.symbols.map((symbol, index) => (
                          <View
                            key={index}
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                            }}
                          >
                            <Checkbox
                              id={`symbol-variant-${index}`}
                              checked={currentVariantIndex === index}
                              onChange={() => {
                                setSymbolVariantPref(index.toString());
                              }}
                            />
                            <label
                              htmlFor={`symbol-variant-${index}`}
                              style={{ marginLeft: '0.5em', cursor: 'pointer' }}
                            >
                              {symbol}
                            </label>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                }
                return null;
              })()}
            </>
          )}
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Currency settings</strong> affect how amounts are displayed
          throughout the application. Changing the currency will affect the
          number format, symbol position, and whether fractions are shown. These
          can be adjusted after the currency is set.
        </Trans>
      </Text>
    </Setting>
  );
}
