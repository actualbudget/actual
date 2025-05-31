import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  currencies,
  getLocalizedCurrencyOption,
} from 'loot-core/shared/currencies';

import { Setting } from './UI';

import { Checkbox } from '@desktop-client/components/forms';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function CurrencySettings() {
  const { t } = useTranslation();

  const [currencyCode, setCurrencyCodePref] = useSyncedPref('currencyCode');
  const selectedCurrencyCode = currencyCode || '';

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

  const handleCurrencyChange = (code: string) => {
    setCurrencyCodePref(code);
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
          <View style={{ width: 'fit-content' }}>
            <Text style={{ fontWeight: 500, marginBottom: '0.5em' }}>
              {t('Currency')}
            </Text>
            <Select
              value={selectedCurrencyCode}
              onChange={handleCurrencyChange}
              options={currencies.map(getLocalizedCurrencyOption)}
              className={selectButtonClassName}
              style={{ width: 'fit-content' }}
            />
          </View>

          {selectedCurrencyCode !== '' && (
            <>
              <View style={{ width: 'fit-content' }}>
                <Text style={{ fontWeight: 500, marginBottom: '0.5em' }}>
                  {t('Symbol Position')}
                </Text>
                <Select
                  value={symbolPosition || 'before'}
                  onChange={value => setSymbolPositionPref(value)}
                  options={symbolPositionOptions.map(f => [f.value, f.label])}
                  className={selectButtonClassName}
                  style={{ width: 'auto' }}
                />
              </View>

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
            </>
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
