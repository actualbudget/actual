import React, { useMemo, useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { send } from 'loot-core/platform/client/fetch';
import { currencies, getCurrency } from 'loot-core/shared/currencies';

import { Column, Setting } from './UI';

import { Warning, Error } from '@desktop-client/components/alerts';
import { Link } from '@desktop-client/components/common/Link';
import { Checkbox, FormLabel } from '@desktop-client/components/forms';
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
        ['BYN', t('Belarusian Ruble')],
        ['CAD', t('Canadian Dollar')],
        ['CHF', t('Swiss Franc')],
        ['CNY', t('Yuan Renminbi')],
        ['COP', t('Colombian Peso')],
        ['CRC', t('Costa Rican Colón')],
        ['CZK', t('Czech Koruna')],
        ['DKK', t('Danish Krone')],
        ['EGP', t('Egyptian Pound')],
        ['EUR', t('Euro')],
        ['GBP', t('Pound Sterling')],
        ['GTQ', t('Guatemalan Quetzal')],
        ['HKD', t('Hong Kong Dollar')],
        ['HUF', t('Hungarian Forint')],
        ['IDR', t('Indonesian Rupiah')],
        ['INR', t('Indian Rupee')],
        ['JMD', t('Jamaican Dollar')],
        ['JPY', t('Japanese Yen')],
        ['LKR', t('Sri Lankan Rupee')],
        ['MDL', t('Moldovan Leu')],
        ['MYR', t('Malaysian Ringgit')],
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
  const [, setNumberFormatPref] = useSyncedPref('numberFormat');
  const [, setHideFractionPref] = useSyncedPref('hideFraction');
  const [enableMultiCurrency, setEnableMultiCurrencyPref] = useSyncedPref(
    'enableMultiCurrency',
  );
  const [enableMultiCurrencyOnBudget, setEnableMultiCurrencyOnBudgetPref] =
    useSyncedPref('enableMultiCurrencyOnBudget');
  const [enableExternalExchangeRates, setEnableExternalExchangeRatesPref] =
    useSyncedPref('enableExternalExchangeRates');
  const [exchangeRateProvider, setExchangeRateProviderPref] = useSyncedPref(
    'exchangeRateProvider',
  );

  const [mempoolSpaceBaseUrl, setMempoolSpaceBaseUrlPref] = useSyncedPref(
    'mempoolSpaceBaseUrl',
  );
  const [openExchangeRatesAppId, setOpenExchangeRatesAppIdPref] = useSyncedPref(
    'openExchangeRatesAppId',
  );

  const [usageData, setUsageData] = useState<{
    planName: string;
    quota: string;
    requests: number;
    requestsQuota: number;
    requestsRemaining: number;
    daysRemaining: number;
    dailyAverage: number;
  } | null>(null);
  const [usageWarning, setUsageWarning] = useState<string | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  // Validate App ID format (32 hexadecimal characters)
  const isValidAppId = (appId: string): boolean => {
    return /^[0-9a-fA-F]{32}$/.test(appId);
  };

  // Fetch usage data when App ID changes
  useEffect(() => {
    const fetchUsage = async () => {
      if (openExchangeRatesAppId) {
        // Validate App ID format before making API call
        if (!isValidAppId(openExchangeRatesAppId)) {
          setUsageData(null);
          setUsageWarning(
            'Invalid App ID format. Must be 32 hexadecimal characters (0-9, A-F).',
          );
          setUsageError(null);
          return;
        }

        try {
          const result = await send('get-openexchangerates-usage');
          if (result) {
            setUsageData(result);
            setUsageWarning(null);
            setUsageError(null);
          } else {
            setUsageData(null);
            setUsageWarning(null);
            setUsageError('Invalid App ID or unable to fetch usage data');
          }
        } catch (error) {
          console.error('Failed to fetch usage data:', error);
          setUsageData(null);
          setUsageWarning(null);
          setUsageError(
            'Failed to fetch usage data. Please check your App ID.',
          );
        }
      } else {
        setUsageData(null);
        setUsageWarning(null);
        setUsageError(null);
      }
    };

    fetchUsage();
  }, [openExchangeRatesAppId]);

  const handleOXRAppIdChange = (appId: string) => {
    setOpenExchangeRatesAppIdPref(appId);
  };

  const selectButtonClassName = css({
    '&[data-hovered]': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  });

  const currencyOptions: [string, string][] = currencies
    .filter(currency => {
      // Hide "None" option when multi-currency is enabled
      // since all accounts should have specific currencies
      if (enableMultiCurrency === 'true' && currency.code === '') {
        return false;
      }
      return true;
    })
    .map(currency => {
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
    const symbol = selectedCurrency.symbol || '$';
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
  }, [selectedCurrencyCode, spaceEnabled, t]);

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
                flexDirection: 'column',
                gap: '1em',
              }}
            >
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

              <Text style={{ borderTop: `1px solid ${theme.tableBorder}` }}>
                <Trans>
                  <br />
                  <strong>Multi-currency</strong> support allows you to have
                  accounts and transactions in different currencies with
                  automatic exchange rate handling.
                  <br />
                  <strong>NOTE:</strong> Multi-currency requires a Default
                  Currency to be set, and must be unchecked before unsetting the
                  default currency.
                </Trans>
              </Text>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                <Checkbox
                  id="settings-enableMultiCurrency"
                  checked={enableMultiCurrency === 'true'}
                  onChange={e =>
                    setEnableMultiCurrencyPref(
                      e.target.checked ? 'true' : 'false',
                    )
                  }
                />
                <label
                  htmlFor="settings-enableMultiCurrency"
                  style={{ marginLeft: '0.5em' }}
                >
                  <Trans>Enable multi-currency support (Experimental)</Trans>
                </label>
              </View>

              {enableMultiCurrency === 'true' && (
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                  }}
                >
                  <Checkbox
                    id="settings-enableMultiCurrencyOnBudget"
                    checked={enableMultiCurrencyOnBudget === 'true'}
                    onChange={e =>
                      setEnableMultiCurrencyOnBudgetPref(
                        e.target.checked ? 'true' : 'false',
                      )
                    }
                  />
                  <label
                    htmlFor="settings-enableMultiCurrencyOnBudget"
                    style={{ marginLeft: '0.5em' }}
                  >
                    <Trans>
                      Allow on-budget accounts to have non-default currency
                    </Trans>
                  </label>
                </View>
              )}

              {enableMultiCurrency === 'true' && (
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1em',
                  }}
                >
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <Checkbox
                      id="settings-enableExternalExchangeRates"
                      checked={enableExternalExchangeRates === 'true'}
                      onChange={e =>
                        setEnableExternalExchangeRatesPref(
                          e.target.checked ? 'true' : 'false',
                        )
                      }
                    />
                    <label
                      htmlFor="settings-enableExternalExchangeRates"
                      style={{ marginLeft: '0.5em' }}
                    >
                      <Trans>Enable external exchange rate providers</Trans>
                    </label>
                  </View>

                  {enableExternalExchangeRates === 'true' && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1em',
                        marginLeft: '1.5em',
                        padding: '1em',
                        backgroundColor: theme.tableBackground,
                        borderRadius: '6px',
                        border: `1px solid ${theme.tableBorder}`,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: '0.9em',
                          color: theme.pageTextLight,
                        }}
                      >
                        <Trans>
                          Select an exchange rate provider and configure its
                          settings.
                        </Trans>
                      </Text>

                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75em',
                        }}
                      >
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <input
                            type="radio"
                            id="provider-mempool"
                            name="exchangeRateProvider"
                            value="mempool"
                            checked={
                              (exchangeRateProvider || 'mempool') === 'mempool'
                            }
                            onChange={e =>
                              setExchangeRateProviderPref(e.target.value)
                            }
                          />
                          <Tooltip
                            content={
                              <Trans>
                                Supports: USD, JPY, GBP, EUR, CHF, CAD, BTC, AUD
                              </Trans>
                            }
                            placement="right"
                          >
                            <label
                              htmlFor="provider-mempool"
                              style={{
                                marginLeft: '0.5em',
                                fontWeight:
                                  (exchangeRateProvider || 'mempool') ===
                                  'mempool'
                                    ? 600
                                    : 400,
                                cursor: 'help',
                              }}
                            >
                              <Trans>
                                Mempool.space (free, no auth needed, can be
                                self-hosted)
                              </Trans>
                            </label>
                          </Tooltip>
                        </View>

                        {(exchangeRateProvider || 'mempool') === 'mempool' && (
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5em',
                              marginLeft: '1.5em',
                              paddingLeft: '1em',
                              borderLeft: `2px solid ${theme.tableBorder}`,
                            }}
                          >
                            <FormLabel title={t('Mempool.space Base URL')} />
                            <Input
                              value={
                                mempoolSpaceBaseUrl || 'https://mempool.space'
                              }
                              onChange={e =>
                                setMempoolSpaceBaseUrlPref(e.target.value)
                              }
                              placeholder="https://mempool.space"
                              style={{ fontSize: '0.9em' }}
                            />
                            <Text
                              style={{
                                fontSize: '0.8em',
                                color: theme.pageTextLight,
                              }}
                            >
                              <Trans>
                                Base URL for Mempool.space API. Change to use a
                                self-hosted instance.
                              </Trans>
                            </Text>
                          </View>
                        )}

                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <input
                            type="radio"
                            id="provider-openexchangerates"
                            name="exchangeRateProvider"
                            value="openexchangerates"
                            checked={
                              exchangeRateProvider === 'openexchangerates'
                            }
                            onChange={e =>
                              setExchangeRateProviderPref(e.target.value)
                            }
                          />
                          <Tooltip
                            content={
                              <Trans>Supports 170+ currencies worldwide</Trans>
                            }
                            placement="right"
                          >
                            <label
                              htmlFor="provider-openexchangerates"
                              style={{
                                marginLeft: '0.5em',
                                fontWeight:
                                  exchangeRateProvider === 'openexchangerates'
                                    ? 600
                                    : 400,
                                cursor: 'help',
                              }}
                            >
                              <Trans>
                                Open Exchange Rates (free, requires App ID)
                              </Trans>
                            </label>
                          </Tooltip>
                        </View>

                        {exchangeRateProvider === 'openexchangerates' && (
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5em',
                              marginLeft: '1.5em',
                              paddingLeft: '1em',
                              borderLeft: `2px solid ${theme.tableBorder}`,
                            }}
                          >
                            <FormLabel
                              title={t('Open Exchange Rates App ID')}
                            />
                            <Input
                              value={openExchangeRatesAppId || ''}
                              onChange={e =>
                                handleOXRAppIdChange(e.target.value)
                              }
                              placeholder={t(
                                'Enter App ID from openexchangerates.org',
                              )}
                              style={{ fontSize: '0.9em' }}
                            />
                            <Text
                              style={{
                                fontSize: '0.8em',
                                color: theme.pageTextLight,
                              }}
                            >
                              <Trans>
                                <Link
                                  variant="external"
                                  to="https://openexchangerates.org/signup"
                                >
                                  Sign up for a free account
                                </Link>{' '}
                                to get your App ID.
                              </Trans>
                            </Text>

                            {usageWarning && (
                              <Warning style={{ marginTop: '0.5em' }}>
                                {usageWarning}
                              </Warning>
                            )}

                            {usageError && (
                              <Error style={{ marginTop: '0.5em' }}>
                                {usageError}
                              </Error>
                            )}

                            {usageData && (
                              <View
                                style={{
                                  marginTop: '0.5em',
                                  padding: '0.75em',
                                  backgroundColor: theme.menuItemBackground,
                                  borderRadius: '4px',
                                  border: `1px solid ${theme.tableBorder}`,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: '0.85em',
                                    fontWeight: 600,
                                    marginBottom: '0.5em',
                                  }}
                                >
                                  <Trans>Current Usage</Trans>
                                </Text>
                                <View
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25em',
                                  }}
                                >
                                  <Text style={{ fontSize: '0.8em' }}>
                                    <Trans>Plan:</Trans>{' '}
                                    <strong>{usageData.planName}</strong> (
                                    {usageData.quota})
                                  </Text>
                                  <Text style={{ fontSize: '0.8em' }}>
                                    <Trans>Requests:</Trans>{' '}
                                    <strong>{usageData.requests}</strong> /{' '}
                                    {usageData.requestsQuota} (
                                    <strong>
                                      {usageData.requestsRemaining}
                                    </strong>{' '}
                                    <Trans>remaining</Trans>)
                                  </Text>
                                  <Text style={{ fontSize: '0.8em' }}>
                                    <Trans>Days Remaining:</Trans>{' '}
                                    <strong>{usageData.daysRemaining}</strong>
                                  </Text>
                                  <Text style={{ fontSize: '0.8em' }}>
                                    <Trans>Daily Average:</Trans>{' '}
                                    <strong>
                                      {usageData.dailyAverage.toFixed(1)}
                                    </strong>{' '}
                                    <Trans>requests/day</Trans>
                                  </Text>
                                  <Text style={{ fontSize: '0.8em' }}>
                                    <Trans>Statistics:</Trans>{' '}
                                    <Link
                                      variant="external"
                                      to="https://openexchangerates.org/account/usage"
                                    >
                                      openexchangerates.org/account/usage
                                    </Link>
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
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
