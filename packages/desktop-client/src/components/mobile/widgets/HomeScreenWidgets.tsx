import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import * as monthUtils from '@actual-app/core/shared/months';

import { useAccountBalances } from '#hooks/useAccountBalances';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useNavigate } from '#hooks/useNavigate';
import { useOnBudgetAccounts } from '#hooks/useOnBudgetAccounts';
import { usePrivacyMode } from '#hooks/usePrivacyMode';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import {
  getHomeScreenWidgetsPlugin,
  routeForWidgetUrl,
} from './homeScreenWidgetsPlugin';
import type {
  HomeScreenWidgetsPlugin,
  WidgetAmount,
  WidgetSnapshot,
} from './homeScreenWidgetsPlugin';

/** Categories sent to the widgets, in budget order. */
const MAX_WIDGET_CATEGORIES = 12;
/** Coalesces the bursts of cell updates that follow a sync. */
const UPDATE_DELAY_MS = 1000;
const MASKED_AMOUNT = '•••••';

/**
 * Keeps the iOS home screen widgets in sync with the open budget, and opens
 * the page a widget was tapped on. Renders nothing; does nothing outside the
 * iOS app.
 */
export function HomeScreenWidgets() {
  const plugin = getHomeScreenWidgetsPlugin();
  if (!plugin) {
    return null;
  }
  return <HomeScreenWidgetsSync plugin={plugin} />;
}

type HomeScreenWidgetsSyncProps = {
  plugin: HomeScreenWidgetsPlugin;
};

function HomeScreenWidgetsSync({ plugin }: HomeScreenWidgetsSyncProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  const navigate = useNavigate();
  const [budgetName] = useMetadataPref('budgetName');
  const [budgetType] = useSyncedPref('budgetType');
  const isPrivacyEnabled = usePrivacyMode();
  const isTracking = budgetType === 'tracking';

  const { data: accounts } = useOnBudgetAccounts();
  const accountIds = (accounts ?? []).map(account => account.id);
  const accountBalances = useAccountBalances(accountIds);

  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const categories = categoryGroups
    .filter(group => !group.hidden && !group.is_income)
    .flatMap(group => group.categories ?? [])
    .filter(category => !category.hidden)
    .slice(0, MAX_WIDGET_CATEGORIES);

  const month = monthUtils.currentMonth();
  const sheetName = monthUtils.sheetForMonth(month);
  const budget = isTracking ? trackingBudget : envelopeBudget;
  const summaryCell = isTracking
    ? trackingBudget.totalSaved
    : envelopeBudget.toBudget;
  const cells = useMonthCells(sheetName, [
    summaryCell,
    ...categories.flatMap(category => [
      budget.catBalance(category.id),
      budget.catBudgeted(category.id),
      budget.catSumAmount(category.id),
    ]),
  ]);

  const isLoaded =
    accounts != null &&
    accountIds.every(id => accountBalances[id] != null) &&
    summaryCell in cells &&
    categories.every(category => budget.catBalance(category.id) in cells);

  const toWidgetAmount = (amount: number): WidgetAmount =>
    isPrivacyEnabled
      ? { amount: 0, formatted: MASKED_AMOUNT }
      : { amount, formatted: format(amount, 'financial') };

  const snapshot: Omit<WidgetSnapshot, 'updatedAt'> | null = isLoaded
    ? {
        version: 1,
        budgetName: budgetName ?? '',
        monthName: monthUtils.format(month, 'MMMM yyyy', locale),
        isPrivacyEnabled,
        labels: {
          budget: t('Budget'),
          accounts: t('Accounts'),
          summary: isTracking ? t('Saved') : t('To budget'),
          addTransaction: t('Add transaction'),
        },
        summary: toWidgetAmount(cells[summaryCell] ?? 0),
        accountsTotal: toWidgetAmount(
          accountIds.reduce((sum, id) => sum + (accountBalances[id] ?? 0), 0),
        ),
        accounts: (accounts ?? []).map(account => ({
          id: account.id,
          name: account.name,
          balance: toWidgetAmount(accountBalances[account.id] ?? 0),
        })),
        categories: categories.map(category => ({
          id: category.id,
          name: category.name,
          balance: toWidgetAmount(cells[budget.catBalance(category.id)] ?? 0),
          budgeted: isPrivacyEnabled
            ? 0
            : (cells[budget.catBudgeted(category.id)] ?? 0),
          spent: isPrivacyEnabled
            ? 0
            : (cells[budget.catSumAmount(category.id)] ?? 0),
        })),
      }
    : null;
  const serializedSnapshot = snapshot ? JSON.stringify(snapshot) : null;

  useEffect(() => {
    if (serializedSnapshot == null) {
      return;
    }
    const timeout = setTimeout(() => {
      const withTimestamp: WidgetSnapshot = {
        ...JSON.parse(serializedSnapshot),
        updatedAt: Date.now(),
      };
      void plugin.updateSnapshot({ snapshot: JSON.stringify(withTimestamp) });
    }, UPDATE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [plugin, serializedSnapshot]);

  // Closing the budget unmounts this component; do not leave its numbers
  // on the home screen.
  useEffect(() => {
    return () => {
      void plugin.clearSnapshot();
    };
  }, [plugin]);

  const openWidgetUrl = useEffectEvent((url: string) => {
    const route = routeForWidgetUrl(url);
    if (route) {
      void navigate(route);
    }
  });

  useEffect(() => {
    const handle = plugin.addListener('urlOpen', ({ url }) =>
      openWidgetUrl(url),
    );
    return () => {
      void handle.then(listener => listener.remove());
    };
  }, [plugin]);

  return null;
}

/**
 * Live values of the named cells on one budget month sheet. A name is
 * present in the result once the spreadsheet has answered for it, with
 * null when the cell has no value.
 */
function useMonthCells(
  sheetName: string,
  names: string[],
): Record<string, number | null> {
  const spreadsheet = useSpreadsheet();
  const namesKey = [...new Set(names)].sort().join(',');
  const bindingKey = `${sheetName}!${namesKey}`;
  // Keyed by the bindings it was collected for, so a change of sheet or
  // names starts from scratch instead of mixing in stale values.
  const [state, setState] = useState<{
    bindingKey: string;
    cells: Record<string, number | null>;
  }>({ bindingKey, cells: {} });

  useEffect(() => {
    if (namesKey === '') {
      return;
    }

    let isMounted = true;
    const unbinds = namesKey.split(',').map(name =>
      spreadsheet.bind(sheetName, name, result => {
        if (!isMounted) {
          return;
        }
        const value = typeof result.value === 'number' ? result.value : null;
        setState(previous => {
          const cells =
            previous.bindingKey === bindingKey ? previous.cells : {};
          if (name in cells && cells[name] === value) {
            return previous;
          }
          return { bindingKey, cells: { ...cells, [name]: value } };
        });
      }),
    );

    return () => {
      isMounted = false;
      for (const unbind of unbinds) {
        unbind();
      }
    };
  }, [spreadsheet, sheetName, namesKey, bindingKey]);

  return state.bindingKey === bindingKey ? state.cells : EMPTY_CELLS;
}

const EMPTY_CELLS: Record<string, number | null> = {};
