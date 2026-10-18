import { useTranslation } from 'react-i18next';

const CURRENCY_DISPLAY_MODES = ['original', 'converted', 'both'] as const;

export type CurrencyDisplayMode = (typeof CURRENCY_DISPLAY_MODES)[number];

export const DEFAULT_CURRENCY_DISPLAY_MODE: CurrencyDisplayMode = 'both';

export function parseCurrencyDisplayMode(
  value: string | undefined,
): CurrencyDisplayMode | null {
  return CURRENCY_DISPLAY_MODES.find(mode => mode === value) ?? null;
}

export function useCurrencyDisplayModeOptions(): Array<
  [CurrencyDisplayMode, string]
> {
  const { t } = useTranslation();
  return [
    ['original', t('Original currency')],
    ['converted', t('Converted to default currency')],
    ['both', t('Both, with the converted amount in parentheses')],
  ];
}

// Which rate amounts are converted with: the latest one for everything, or
// the one in effect on the date of each amount
export type ConversionRateMode = 'latest' | 'historical';

export function parseConversionRateMode(
  value: string | undefined,
): ConversionRateMode {
  return value === 'historical' ? 'historical' : 'latest';
}

export function useConversionRateModeOptions(): Array<
  [ConversionRateMode, string]
> {
  const { t } = useTranslation();
  return [
    ['latest', t('Latest rate (current value)')],
    ['historical', t('Rate on each date (value at the time)')],
  ];
}
