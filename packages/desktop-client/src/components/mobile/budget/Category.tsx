import React from 'react';
import { useParams, useSearchParams } from 'react-router';

import * as monthUtils from 'loot-core/shared/months';

import { CategoryTransactions } from './CategoryTransactions';

import { useCategories } from '@desktop-client/hooks/useCategories';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function Category() {
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');

  const { id: categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const month = searchParams.get('month') || monthUtils.currentMonth();
  const { list: categories } = useCategories();
  const category = categories.find(c => c.id === categoryId);

  if (category == null) {
    return null;
  }

  return (
    <CategoryTransactions
      // This key forces the whole table rerender when the number
      // format changes
      key={numberFormat + hideFraction}
      category={category}
      month={month}
    />
  );
}
