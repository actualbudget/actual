import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import * as monthUtils from 'loot-core/src/shared/months';

import { useCategories } from '../../../hooks/useCategories';
import { useSyncedPref } from '../../../hooks/useSyncedPref';

import { CategoryTransactions } from './CategoryTransactions';

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
