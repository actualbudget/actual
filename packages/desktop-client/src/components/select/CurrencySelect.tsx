// @ts-strict-ignore
import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';

import { currencies } from 'loot-core/shared/currencies';

type CurrencySelectProps = {
  value: string;
  onChange: (code: string) => void;
  currencyCodes?: string[];
  includeNoneOption?: boolean;
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
};

export function CurrencySelect({
  value,
  onChange,
  currencyCodes,
  includeNoneOption = true,
  style,
  className,
  disabled,
}: CurrencySelectProps) {
  const { t } = useTranslation();

  const currencyOptions: [string, string][] = currencies
    .filter(currency => {
      // Filter out "None" option if includeNoneOption is false
      if (!includeNoneOption && currency.code === '') {
        return false;
      }
      // If currencyCodes is provided, only show those currencies (plus "None" if applicable)
      if (currencyCodes && currency.code !== '') {
        return currencyCodes.includes(currency.code);
      }
      return true;
    })
    .map(currency => {
      if (currency.code === '') {
        return ['', t('None')];
      }
      return [
        currency.code,
        `${currency.code} - ${t(currency.name)} (${currency.symbol})`,
      ];
    });

  return (
    <Select
      value={value}
      onChange={onChange}
      options={currencyOptions}
      style={style}
      className={className}
      disabled={disabled}
    />
  );
}
