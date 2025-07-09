import { useEffect, useMemo, useState } from 'react';

import * as monthUtils from 'loot-core/shared/months';

import { useCategories } from './useCategories';
import { useSpreadsheet } from './useSpreadsheet';
import { useSyncedPref } from './useSyncedPref';

import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

type UseOverspentCategoriesProps = {
  month: string;
};

export function useOverspentCategories({ month }: UseOverspentCategoriesProps) {
  const spreadsheet = useSpreadsheet();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const { list: categories } = useCategories();

  const categoryBalanceBindings = useMemo(
    () =>
      categories.map(category => [
        category.id,
        budgetType === 'tracking'
          ? trackingBudget.catBalance(category.id)
          : envelopeBudget.catBalance(category.id),
      ]),
    [budgetType, categories],
  );

  const categoryCarryoverBindings = useMemo(
    () =>
      categories.map(category => [
        category.id,
        budgetType === 'tracking'
          ? trackingBudget.catCarryover(category.id)
          : envelopeBudget.catCarryover(category.id),
      ]),
    [budgetType, categories],
  );

  const [overspentByCategory, setOverspentByCategory] = useState<
    Record<string, number>
  >({});
  const [carryoverFlagByCategory, setCarryoverFlagByCategory] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setOverspentByCategory({});
    setCarryoverFlagByCategory({});
  }, [month]);

  const sheetName = monthUtils.sheetForMonth(month);

  useEffect(() => {
    const unbindList: (() => void)[] = [];
    for (const [categoryId, carryoverBinding] of categoryCarryoverBindings) {
      const unbind = spreadsheet.bind(sheetName, carryoverBinding, result => {
        const isRolloverEnabled = Boolean(result.value);
        if (isRolloverEnabled) {
          setCarryoverFlagByCategory(prev => ({
            ...prev,
            [categoryId]: isRolloverEnabled,
          }));
        } else {
          // Update to remove covered category.
          setCarryoverFlagByCategory(prev => {
            const { [categoryId]: _, ...rest } = prev;
            return rest;
          });
        }
      });
      unbindList.push(unbind);
    }

    return () => {
      unbindList.forEach(unbind => unbind());
    };
  }, [categoryCarryoverBindings, sheetName, spreadsheet]);

  useEffect(() => {
    const unbindList: (() => void)[] = [];
    for (const [categoryId, balanceBinding] of categoryBalanceBindings) {
      const unbind = spreadsheet.bind(sheetName, balanceBinding, result => {
        const balance = result.value as number;
        if (balance < 0) {
          setOverspentByCategory(prev => ({
            ...prev,
            [categoryId]: balance,
          }));
        } else if (balance >= 0) {
          // Update to remove covered category.
          setOverspentByCategory(prev => {
            const { [categoryId]: _, ...rest } = prev;
            return rest;
          });
        }
      });
      unbindList.push(unbind);
    }

    return () => {
      unbindList.forEach(unbind => unbind());
    };
  }, [categoryBalanceBindings, sheetName, spreadsheet]);

  // Ignore those that has rollover enabled.
  const overspentCategoryIds = Object.keys(overspentByCategory).filter(
    id => !carryoverFlagByCategory[id],
  );

  return useMemo(
    () =>
      categories.filter(
        category =>
          overspentCategoryIds.includes(category.id) && !category.is_income,
      ),
    [categories, overspentCategoryIds],
  );
}
