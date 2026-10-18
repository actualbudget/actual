import { useTranslation } from 'react-i18next';

import { currencies } from '@actual-app/core/shared/currencies';
import { isSupportedCurrencyCode } from '@actual-app/core/shared/fx/currency';

export function useCurrencyOptions() {
  const { t } = useTranslation();

  const currencyTranslations = new Map<string, string>([
    ['', t('None')],
    ['AED', t('UAE Dirham')],
    ['ARS', t('Argentinian Peso')],
    ['AUD', t('Australian Dollar')],
    ['BDT', t('Bangladeshi Taka')],
    ['BRL', t('Brazilian Real')],
    ['BYN', t('Belarusian Ruble')],
    ['CAD', t('Canadian Dollar')],
    ['CHF', t('Swiss Franc')],
    ['CLP', t('Chilean Peso')],
    ['CNY', t('Yuan Renminbi')],
    ['COP', t('Colombian Peso')],
    ['CRC', t('Costa Rican Colón')],
    ['CZK', t('Czech Koruna')],
    ['DKK', t('Danish Krone')],
    ['DOP', t('Dominican Peso')],
    ['EGP', t('Egyptian Pound')],
    ['EUR', t('Euro')],
    ['GBP', t('Pound Sterling')],
    ['GTQ', t('Guatemalan Quetzal')],
    ['HKD', t('Hong Kong Dollar')],
    ['HUF', t('Hungarian Forint')],
    ['IDR', t('Indonesian Rupiah')],
    ['ILS', t('Israeli New Shekel')],
    ['INR', t('Indian Rupee')],
    ['IRR', t('Iranian Rial')],
    ['JMD', t('Jamaican Dollar')],
    ['JPY', t('Japanese Yen')],
    ['KRW', t('South Korean Won')],
    ['LKR', t('Sri Lankan Rupee')],
    ['MDL', t('Moldovan Leu')],
    ['MKD', t('Macedonian Denar')],
    ['MXN', t('Mexican Peso')],
    ['MYR', t('Malaysian Ringgit')],
    ['NOK', t('Norwegian Krone')],
    ['PEN', t('Peruvian Sol')],
    ['PHP', t('Philippine Peso')],
    ['PKR', t('Pakistani Rupee')],
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
    ['TWD', t('New Taiwan Dollar')],
    ['TZS', t('Tanzanian Shilling')],
    ['UAH', t('Ukrainian Hryvnia')],
    ['USD', t('US Dollar')],
    ['UYU', t('Uruguayan Peso')],
    ['UZS', t('Uzbek Soum')],
    ['ZAR', t('South African Rand')],
  ]);

  const getCurrencyName = (code: string) =>
    currencyTranslations.get(code) ??
    currencies.find(currency => currency.code === code)?.name ??
    code;

  // "CAD - Canadian Dollar (CA$)", or just "None" for the empty code
  const getCurrencyLabel = (code: string) => {
    const currency = currencies.find(c => c.code === code);
    if (!currency || currency.code === '') {
      return getCurrencyName(code);
    }
    return `${currency.code} - ${getCurrencyName(code)} (${currency.symbol})`;
  };

  const currencyOptions: Array<[string, string]> = currencies.map(currency => [
    currency.code,
    getCurrencyLabel(currency.code),
  ]);

  // The currencies an account can be given, plus the one it already has so a
  // picker can still show it
  const getAccountCurrencyOptions = (
    currentCurrency: string | null,
  ): Array<[string, string]> => {
    const options = currencyOptions.filter(([code]) =>
      isSupportedCurrencyCode(code),
    );
    return currentCurrency &&
      !options.some(([code]) => code === currentCurrency)
      ? [...options, [currentCurrency, getCurrencyLabel(currentCurrency)]]
      : options;
  };

  return {
    currencyOptions,
    getAccountCurrencyOptions,
    getCurrencyName,
    getCurrencyLabel,
  };
}
