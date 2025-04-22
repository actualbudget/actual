// @ts-strict-ignore
import { type CSSProperties } from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { t, type TFunction } from 'i18next';

import { type useSpreadsheet } from 'loot-core/client/SpreadsheetProvider';
import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { type Handlers } from 'loot-core/types/handlers';
import {
  type ScheduleEntity,
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';
import { type SyncedPrefs } from 'loot-core/types/prefs';

import { type DropPosition } from '../sort';

import { getValidMonthBounds } from './MonthsContext';

export function addToBeBudgetedGroup(groups: CategoryGroupEntity[]) {
  return [
    {
      id: 'to-budget',
      name: t('To Budget'),
      categories: [
        {
          id: 'to-budget',
          name: t('To  Budget'),
          group: 'to-budget',
        },
      ],
    } as CategoryGroupEntity,
    ...groups,
  ];
}

export function removeCategoriesFromGroups(
  categoryGroups: CategoryGroupEntity[],
  ...categoryIds: CategoryEntity['id'][]
) {
  if (!categoryIds || categoryIds.length === 0) return categoryGroups;

  const categoryIdsSet = new Set(categoryIds);

  return categoryGroups
    .map(group => ({
      ...group,
      categories:
        group.categories?.filter(cat => !categoryIdsSet.has(cat.id)) ?? [],
    }))
    .filter(group => group.categories?.length);
}

export function separateGroups(categoryGroups: CategoryGroupEntity[]) {
  return [
    categoryGroups.filter(g => !g.is_income),
    categoryGroups.find(g => g.is_income),
  ] as const;
}

export function makeAmountGrey(value: number | string): CSSProperties {
  return value === 0 || value === '0' || value === '' || value == null
    ? { color: theme.tableTextSubdued }
    : null;
}

export function makeBalanceAmountStyle(
  value: number,
  goalValue?: number | null,
  budgetedValue?: number | null,
) {
  if (value < 0) {
    return { color: theme.errorText };
  }

  if (goalValue == null) {
    const greyed = makeAmountGrey(value);
    if (greyed) {
      return greyed;
    }
  } else {
    if (budgetedValue < goalValue) {
      return { color: theme.warningText };
    }
    return { color: theme.noticeText };
  }
}

export function makeAmountFullStyle(
  value: number,
  colors?: {
    positiveColor?: string;
    negativeColor?: string;
    zeroColor?: string;
  },
) {
  const positiveColorToUse = colors?.positiveColor || theme.noticeText;
  const negativeColorToUse = colors?.negativeColor || theme.errorText;
  const zeroColorToUse = colors?.zeroColor || theme.tableTextSubdued;
  return {
    color:
      value < 0
        ? negativeColorToUse
        : value === 0
          ? zeroColorToUse
          : positiveColorToUse,
  };
}

export function findSortDown(
  arr: CategoryGroupEntity[],
  pos: DropPosition,
  targetId: string,
) {
  if (pos === 'top') {
    return { targetId };
  } else {
    const idx = arr.findIndex(item => item.id === targetId);

    if (idx === -1) {
      throw new Error('findSort: item not found: ' + targetId);
    }

    const newIdx = idx + 1;
    if (newIdx < arr.length) {
      return { targetId: arr[newIdx].id };
    } else {
      // Move to the end
      return { targetId: null };
    }
  }
}

export function findSortUp(
  arr: CategoryGroupEntity[],
  pos: DropPosition,
  targetId: string,
) {
  if (pos === 'bottom') {
    return { targetId };
  } else {
    const idx = arr.findIndex(item => item.id === targetId);

    if (idx === -1) {
      throw new Error('findSort: item not found: ' + targetId);
    }

    const newIdx = idx - 1;
    if (newIdx >= 0) {
      return { targetId: arr[newIdx].id };
    } else {
      // Move to the beginning
      return { targetId: null };
    }
  }
}

export function getScrollbarWidth() {
  return Math.max(styles.scrollbarWidth - 2, 0);
}

export async function prewarmMonth(
  budgetType: SyncedPrefs['budgetType'],
  spreadsheet: ReturnType<typeof useSpreadsheet>,
  month: string,
) {
  const method: keyof Handlers =
    budgetType === 'report' ? 'tracking-budget-month' : 'envelope-budget-month';

  const values = await send(method, { month });

  for (const value of values) {
    spreadsheet.prewarmCache(value.name, value);
  }
}

export async function prewarmAllMonths(
  budgetType: SyncedPrefs['budgetType'],
  spreadsheet: ReturnType<typeof useSpreadsheet>,
  bounds: { start: string; end: string },
  startMonth: string,
) {
  const numMonths = 3;

  bounds = getValidMonthBounds(
    bounds,
    monthUtils.subMonths(startMonth, 1),
    monthUtils.addMonths(startMonth, numMonths + 1),
  );
  const months = monthUtils.rangeInclusive(bounds.start, bounds.end);

  await Promise.all(
    months.map(month => prewarmMonth(budgetType, spreadsheet, month)),
  );
}

export function getScheduleStatusTooltip({
  t,
  schedule,
  scheduleStatus,
  locale,
}: {
  t: TFunction;
  schedule: ScheduleEntity;
  scheduleStatus: 'missed' | 'due' | 'upcoming';
  locale?: Locale;
}) {
  const isToday = monthUtils.isCurrentDay(schedule.next_date);
  const distanceFromNow = monthUtils.formatDistance(
    schedule.next_date,
    monthUtils.currentDay(),
    locale,
    {
      addSuffix: true,
    },
  );
  const formattedDate = monthUtils.format(schedule.next_date, 'MMMM d', locale);
  switch (scheduleStatus) {
    case 'missed':
      return t(
        'Missed {{scheduleName}} due {{distanceFromNow}} ({{formattedDate}})',
        {
          scheduleName: schedule.name,
          distanceFromNow,
          formattedDate,
        },
      );
    case 'due':
    case 'upcoming':
      return t(
        '{{scheduleName}} is due {{distanceFromNow}} ({{formattedDate}})',
        {
          scheduleName: schedule.name,
          distanceFromNow: isToday ? t('today') : distanceFromNow,
          formattedDate,
        },
      );
    default:
      throw new Error(`Unrecognized schedule status: ${scheduleStatus}`);
  }
}
