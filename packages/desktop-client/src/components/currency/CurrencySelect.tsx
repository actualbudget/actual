import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { Select } from '@actual-app/components/select';
import type { CSSProperties } from '@actual-app/components/styles';

import { useCurrencyOptions } from './useCurrencyOptions';

// Select values must be strings, so `null` (follow the budget's default
// currency) is represented by this placeholder
const DEFAULT_CURRENCY_VALUE = '__default__';

type CurrencySelectProps = {
  id?: string;
  value: string | null;
  // The currency the account has now, listed even if it can no longer be
  // chosen
  savedValue?: string | null;
  defaultCurrencyCode: string;
  onChange: (currency: string | null) => void;
  disabled?: boolean;
  style?: CSSProperties;
};

export function CurrencySelect({
  id,
  value,
  savedValue,
  defaultCurrencyCode,
  onChange,
  disabled,
  style,
}: CurrencySelectProps) {
  const { t } = useTranslation();
  const { getAccountCurrencyOptions } = useCurrencyOptions();

  return (
    <Select
      id={id}
      value={value ?? DEFAULT_CURRENCY_VALUE}
      onChange={newValue =>
        onChange(newValue === DEFAULT_CURRENCY_VALUE ? null : newValue)
      }
      options={[
        [
          DEFAULT_CURRENCY_VALUE,
          t('Budget default ({{currency}})', { currency: defaultCurrencyCode }),
        ],
        Menu.line,
        ...getAccountCurrencyOptions(savedValue ?? value),
      ]}
      disabled={disabled}
      style={{ maxWidth: '100%', ...style }}
    />
  );
}
