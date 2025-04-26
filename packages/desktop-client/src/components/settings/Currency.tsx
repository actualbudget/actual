import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import { useFormat } from '../../components/spreadsheet/useFormat';

import { 
  currencies, 
  getLocalizedCurrencyOption, 
  getCurrency 
} from 'loot-core/shared/currencies';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { Checkbox } from '../forms';

import { Setting } from './UI';

export function CurrencySettings() {
  const { t } = useTranslation();
  const format = useFormat();
  
  const [currencyCode, setCurrencyCodePref] = useSyncedPref('currencyCode');
  const selectedCurrencyCode = currencyCode || '';
  
  const [symbolPosition, setSymbolPositionPref] = 
    useSyncedPref('currencySymbolPosition');
  const [spaceEnabled, setSpaceEnabledPref] = 
    useSyncedPref('currencySpaceBetweenAmountAndSymbol');

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

  const formatSample = () => {

    const sampleAmount = 123456;
    
    return format(sampleAmount, 'financial');
  };

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
            <Text style={{ fontWeight: 500, marginBottom: '0.5em' }}>{t('Currency')}</Text>
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
                <Text style={{ fontWeight: 500, marginBottom: '0.5em' }}>{t('Symbol Position')}</Text>
                <Select
                  value={symbolPosition || 'before'}
                  onChange={value => setSymbolPositionPref(value)}
                  options={symbolPositionOptions.map(f => [f.value, f.label])}
                  className={selectButtonClassName}
                  style={{ width: 'auto' }}
                />
              </View>
              
              <View style={{ 
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}>
                <Checkbox
                  id="settings-spaceEnabled"
                  checked={spaceEnabled === 'true'}
                  onChange={e => setSpaceEnabledPref(e.target.checked ? 'true' : 'false')}
                />
                <label htmlFor="settings-spaceEnabled" style={{ marginLeft: '0.5em' }}>
                  <Trans>Add space between amount and symbol</Trans>
                </label>
              </View>
              
              <View style={{ 
                padding: '10px', 
                border: `1px solid ${theme.pillBorder}`,
                borderRadius: '4px',
                marginTop: '0.5em',
              }}>
                <Text style={{ fontWeight: 500 }}>{t('Preview')}:</Text>
                <Text style={{ fontSize: '1.2em', marginTop: '5px' }}>{formatSample()}</Text>
              </View>
            </>
          )}
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Currency settings</strong> affect how amounts are displayed throughout 
          the application.
        </Trans>
      </Text>
    </Setting>
  );
}