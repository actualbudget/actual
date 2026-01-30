import React from 'react';

import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { getCurrency } from 'loot-core/shared/currencies';
import { type CategoryEntity } from 'loot-core/types/models';

import { CURRENCY_COLUMN_WIDTH } from './constants';

import { useOnBudgetCurrencies } from '@desktop-client/hooks/useOnBudgetCurrencies';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

// Sentinel value for "use default currency"
const DEFAULT_CURRENCY_VALUE = '__default__';

type CategoryCurrencyCellProps = {
  category: CategoryEntity;
  onSave?: (category: CategoryEntity) => void;
};

export function CategoryCurrencyCell({
  category,
  onSave,
}: CategoryCurrencyCellProps) {
  const currencies = useOnBudgetCurrencies();
  const [defaultCurrencyCode] = useSyncedPref('defaultCurrencyCode');

  const handleCurrencyChange = (newCurrency: string) => {
    console.log('[CategoryCurrencyCell] handleCurrencyChange called with:', {
      newCurrency,
      DEFAULT_CURRENCY_VALUE,
      defaultCurrencyCode,
      isDefault:
        newCurrency === DEFAULT_CURRENCY_VALUE ||
        newCurrency === defaultCurrencyCode,
      categoryId: category.id,
      currentCurrency: category.currency,
    });
    if (onSave) {
      const updatedCategory = {
        ...category,
        // Sentinel value or default currency code = null (use default)
        currency:
          newCurrency === DEFAULT_CURRENCY_VALUE ||
          newCurrency === defaultCurrencyCode
            ? null
            : newCurrency,
      };
      console.log(
        '[CategoryCurrencyCell] Calling onSave with:',
        updatedCategory,
      );
      onSave(updatedCategory);
    } else {
      console.log('[CategoryCurrencyCell] onSave is not defined!');
    }
  };

  // Current value: if null/undefined, use the sentinel value
  const currentValue = category.currency || DEFAULT_CURRENCY_VALUE;

  // Build options: sentinel = default currency, then other currencies
  const options: Array<[string, string]> = [
    [
      DEFAULT_CURRENCY_VALUE,
      defaultCurrencyCode ? `${defaultCurrencyCode}` : 'Default',
    ],
    ...currencies
      .filter(c => c !== defaultCurrencyCode)
      .map(c => [c, getCurrency(c).code] as [string, string]),
  ];

  console.log('[CategoryCurrencyCell] render:', {
    categoryId: category.id,
    categoryName: category.name,
    categoryCurrency: category.currency,
    currentValue,
    options,
  });

  return (
    <View
      style={{
        width: CURRENCY_COLUMN_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <Select
        value={currentValue}
        onChange={handleCurrencyChange}
        options={options}
        style={{
          fontSize: 12,
          padding: '2px 4px',
          minWidth: 50,
        }}
      />
    </View>
  );
}
