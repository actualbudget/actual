import { useEffect, useMemo, useState } from 'react';

import * as monthUtils from 'loot-core/shared/months';
import { groupById } from 'loot-core/shared/util';
import type { IntegerAmount } from 'loot-core/shared/util';
import type { CategoryEntity } from 'loot-core/types/models';

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

type UseOverspentCategoriesResult = {
  categories: CategoryEntity[];
  amountsByCategory: Map<CategoryEntity['id'], IntegerAmount>;
  totalAmount: IntegerAmount;
};

export function useOverspentCategories({
  month,
}: UseOverspentCategoriesProps): UseOverspentCategoriesResult {
  const spreadsheet = useSpreadsheet();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const {
    data: { list: categories, grouped: categoryGroups } = {
      list: [],
      grouped: [],
    },
  } = useCategories();
  const categoryGroupsById = useMemo(
    () => groupById(categoryGroups),
    [categoryGroups],
  );

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

  const [overspendingByCategory, setOverspendingByCategory] = useState<
    Record<string, IntegerAmount>
  >({});
  const [carryoverFlagByCategory, setCarryoverFlagByCategory] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setOverspendingByCategory({});
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
          setOverspendingByCategory(prev => ({
            ...prev,
            [categoryId]: balance,
          }));
        } else if (balance >= 0) {
          // Update to remove covered category.
          setOverspendingByCategory(prev => {
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

  return useMemo(() => {
    // Ignore those that has rollover enabled.
    const categoryIdsToReturn = Object.keys(overspendingByCategory).filter(
      id => !carryoverFlagByCategory[id],
    );

    const categoriesToReturn = categories
      .filter(
        category =>
          categoryIdsToReturn.includes(category.id) && !category.is_income,
      )
      .filter(category =>
        budgetType === 'tracking'
          ? !category.hidden && !categoryGroupsById[category.group]?.hidden
          : true,
      );

    const amountsByCategory = new Map(
      categoriesToReturn.map(category => [
        category.id,
        overspendingByCategory[category.id],
      ]),
    );

    const totalAmount = Array.from(amountsByCategory.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      categories: categoriesToReturn,
      amountsByCategory,
      totalAmount,
    };
  }, [
    budgetType,
    carryoverFlagByCategory,
    categories,
    categoryGroupsById,
    overspendingByCategory,
  ]);
}
