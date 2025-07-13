import React, { ReactNode } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { currencies } from 'loot-core/shared/currencies';

import { Column, Setting } from './UI';

import { Checkbox } from '@desktop-client/components/forms';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function CurrencySettings() {
  const { t } = useTranslation();

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

  const selectButtonClassName = css({
    '&[data-hovered]': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  });

  const currencyTranslations = new Map([
    ['', t('None')],
    ['AUD', t('Australian Dollar')],
    ['CAD', t('Canadian Dollar')],
    ['CHF', t('Swiss Franc')],
    ['CNY', t('Yuan Renminbi')],
    ['EUR', t('Euro')],
    ['GBP', t('Pound Sterling')],
    ['HKD', t('Hong Kong Dollar')],
    // ['JPY', t('Yen')],
    ['SGD', t('Singapore Dollar')],
    ['USD', t('US Dollar')],
  ]);

  const currencyOptions: [string, string][] = currencies.map(currency => {
    const translatedName =
      currencyTranslations.get(currency.code) ?? currency.name;
    if (currency.code === '') {
      return [currency.code, translatedName];
    }
    return [
      currency.code,
      `${currency.code} - ${translatedName} (${currency.symbol})`,
    ];
  });

  const handleCurrencyChange = (code: string) => {
    setDefaultCurrencyCodePref(code);
  };

  const symbolPositionOptions = [
    { value: 'before', label: t('Before amount (e.g. $100)') },
    { value: 'after', label: t('After amount (e.g. 100€)') },
  ];

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
          )}
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Currency settings</strong> affect how amounts are displayed
          throughout the application.
        </Trans>
      </Text>
    </Setting>
  );
}
