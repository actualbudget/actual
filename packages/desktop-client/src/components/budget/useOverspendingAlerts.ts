import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { useCategories } from '#hooks/useCategories';
import { useLocale } from '#hooks/useLocale';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { isOverspentBalance } from './util';

export type OverspendingAlert = {
  month: string;
  categoryId: CategoryEntity['id'];
};

// Month + category pairs already alerted in this session. Kept in memory
// only, so alerts show again after the app is reloaded.
const alertedKeys = new Set<string>();

function alertKey(month: string, categoryId: CategoryEntity['id']) {
  return `${month}:${categoryId}`;
}

/**
 * Compares the overspent categories of each fully loaded month with the
 * ones already alerted, and returns the categories that just became
 * overspent. Categories that are no longer overspent are forgotten, so
 * they alert again if they become overspent later.
 */
export function collectNewOverspending(
  alerted: Set<string>,
  overspentByMonth: Map<string, Array<CategoryEntity['id']>>,
): OverspendingAlert[] {
  const newAlerts: OverspendingAlert[] = [];

  for (const [month, overspentIds] of overspentByMonth) {
    const currentKeys = new Set(overspentIds.map(id => alertKey(month, id)));

    for (const key of alerted) {
      if (key.startsWith(`${month}:`) && !currentKeys.has(key)) {
        alerted.delete(key);
      }
    }

    for (const categoryId of overspentIds) {
      const key = alertKey(month, categoryId);
      if (!alerted.has(key)) {
        alerted.add(key);
        newAlerts.push({ month, categoryId });
      }
    }
  }

  return newAlerts;
}

type UseOverspendingAlertsProps = {
  months: string[];
  onShowCategory: (categoryId: CategoryEntity['id'], month: string) => void;
};

export function useOverspendingAlerts({
  months,
  onShowCategory,
}: UseOverspendingAlertsProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const locale = useLocale();
  const spreadsheet = useSpreadsheet();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const [overspendingAlertsPref] = useSyncedPref('overspendingAlerts');
  const isEnabled = String(overspendingAlertsPref) !== 'false';
  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();

  // Visible expense categories, in the order they appear in the budget
  const categories = useMemo(
    () =>
      categoryGroups
        .filter(group => !group.is_income && !group.hidden)
        .flatMap(group => group.categories ?? [])
        .filter(category => !category.is_income && !category.hidden),
    [categoryGroups],
  );

  const [balancesByMonth, setBalancesByMonth] = useState<
    Record<string, Record<CategoryEntity['id'], number>>
  >({});

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const unbindList: Array<() => void> = [];
    for (const month of months) {
      const sheetName = monthUtils.sheetForMonth(month);
      for (const category of categories) {
        const binding =
          budgetType === 'tracking'
            ? trackingBudget.catBalance(category.id)
            : envelopeBudget.catBalance(category.id);
        const unbind = spreadsheet.bind(sheetName, binding, result => {
          setBalancesByMonth(prev => ({
            ...prev,
            [month]: { ...prev[month], [category.id]: result.value as number },
          }));
        });
        unbindList.push(unbind);
      }
    }

    return () => {
      unbindList.forEach(unbind => unbind());
      setBalancesByMonth({});
    };
  }, [budgetType, categories, isEnabled, months, spreadsheet]);

  const onShowCategoryRef = useRef(onShowCategory);
  useEffect(() => {
    onShowCategoryRef.current = onShowCategory;
  });

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // Only look at months whose balances have all loaded, so the initial
    // load is reported as one notification instead of one per category.
    const overspentByMonth = new Map<string, Array<CategoryEntity['id']>>();
    for (const month of months) {
      const balances = balancesByMonth[month];
      if (
        !balances ||
        categories.some(category => !(category.id in balances))
      ) {
        continue;
      }
      overspentByMonth.set(
        month,
        categories
          .filter(category => isOverspentBalance(balances[category.id]))
          .map(category => category.id),
      );
    }

    const newAlerts = collectNewOverspending(alertedKeys, overspentByMonth);
    if (newAlerts.length === 0) {
      return;
    }

    const [first] = newAlerts;
    const monthName = monthUtils.format(first.month, 'MMMM yyyy', locale);
    const isSingleMonth = newAlerts.every(alert => alert.month === first.month);

    let message;
    if (newAlerts.length === 1) {
      message = t('{{category}} is overspent in {{month}}.', {
        category: categories.find(category => category.id === first.categoryId)
          ?.name,
        month: monthName,
      });
    } else if (isSingleMonth) {
      message = t('{{count}} categories are overspent in {{month}}.', {
        count: newAlerts.length,
        month: monthName,
      });
    } else {
      message = t('{{count}} categories are overspent in the months shown.', {
        count: newAlerts.length,
      });
    }

    dispatch(
      addNotification({
        notification: {
          type: 'warning',
          message,
          button: {
            title: t('Show'),
            action: () =>
              onShowCategoryRef.current(first.categoryId, first.month),
          },
        },
      }),
    );
  }, [balancesByMonth, categories, dispatch, isEnabled, locale, months, t]);
}
