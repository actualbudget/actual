import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getEffectiveCurrency } from '@actual-app/core/shared/fx/currency';
import {
  EVERY_CURRENCY,
  getOwnLineStart,
  parseOwnLines,
} from '@actual-app/core/shared/fx/ownLines';
import type { OwnLineStarts } from '@actual-app/core/shared/fx/ownLines';
import { findRate } from '@actual-app/core/shared/fx/rates';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryCurrencyEntity,
  CategoryEntity,
} from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';

import { categoryCurrencyQueries } from '#currency/queries';

import { useAccounts } from './useAccounts';
import { useExchangeRates } from './useExchangeRates';
import { useFormat } from './useFormat';
import type { FormatType } from './useFormat';
import { useMultiCurrency } from './useMultiCurrency';
import { useSyncedPref } from './useSyncedPref';

// A line of a category in the budget: the category's own budget, in the
// default currency, or one of its other currencies
export type CategoryLine = {
  // The category's id, or the id of its currency line
  id: string;
  currencyCode: string;
  // 'YYYY-MM' from which a currency line is budgeted; categories always are
  startMonth?: string;
};

type CategoryCurrencies = {
  // The lines of a category, its own first; empty for one without other
  // currencies or while multiple currencies are off
  getLines: (categoryId: CategoryEntity['id']) => CategoryLine[];
  // The currency line with this id
  getLine: (id: string) => CategoryCurrencyEntity | undefined;
  currencies: readonly CategoryCurrencyEntity[];
  // True until the lines are known, so a budget isn't drawn without them
  isLoading: boolean;
};

const EMPTY: readonly CategoryCurrencyEntity[] = [];

// Only queried while multiple currencies are on
export function useCategoryCurrencies(): CategoryCurrencies {
  const { isEnabled, defaultCurrencyCode } = useMultiCurrency();
  const { data, isPending } = useQuery({
    ...categoryCurrencyQueries.list(),
    enabled: isEnabled,
  });
  const currencies = isEnabled && data ? data : EMPTY;
  const isLoading = isEnabled && isPending;

  return useMemo(() => {
    const byCategory = new Map<string, CategoryCurrencyEntity[]>();
    const byId = new Map<string, CategoryCurrencyEntity>();
    for (const line of currencies) {
      byId.set(line.id, line);
      byCategory.set(line.category, [
        ...(byCategory.get(line.category) ?? []),
        line,
      ]);
    }

    return {
      getLines: categoryId => {
        const lines = byCategory.get(categoryId);
        return lines
          ? [
              { id: categoryId, currencyCode: defaultCurrencyCode },
              ...lines.map(line => ({
                id: line.id,
                currencyCode: line.currency,
                startMonth: line.start_month ?? undefined,
              })),
            ]
          : [];
      },
      getLine: id => byId.get(id),
      currencies,
      isLoading,
    };
  }, [currencies, defaultCurrencyCode, isLoading]);
}

// The category a budget line belongs to, and its currency when it is a
// currency line rather than the category's own budget
export function useBudgetLine(id: string): {
  categoryId: CategoryEntity['id'];
  currencyCode: string | undefined;
} {
  const { getLine } = useCategoryCurrencies();
  const line = getLine(id);
  return { categoryId: line?.category ?? id, currencyCode: line?.currency };
}

// The spending a category converts in `month` from other currencies, as it
// has no line in them, by account and in the account's currency
export function useConvertedSpending(
  categoryId: CategoryEntity['id'],
  month: string,
): Array<{ account: string; currency: string; amount: number }> {
  const { isEnabled } = useMultiCurrency();
  const { data } = useQuery({
    ...categoryCurrencyQueries.convertedSpending(month),
    enabled: isEnabled,
  });
  return useMemo(
    () =>
      (isEnabled && data ? data : []).filter(
        row => row.category === categoryId,
      ),
    [categoryId, data, isEnabled],
  );
}

// Marks the totals of a category in `month` as approximate when one of its
// currency lines has no rate on or before the end of the month: it then
// counts 1:1, or at a later rate
export function useApproximateLineTotal(
  categoryId: CategoryEntity['id'],
  month: string,
): {
  formatter?: (value: unknown, type?: FormatType) => string;
  title?: string;
} {
  const { t } = useTranslation();
  const format = useFormat();
  const { isEnabled, defaultCurrencyCode } = useMultiCurrency();
  const { getLines } = useCategoryCurrencies();
  const { rateIndex, isLoading } = useExchangeRates({ enabled: isEnabled });

  // Nothing is known to be missing until the rates are
  if (isLoading) {
    return {};
  }

  const monthEnd = monthUtils.lastDayOfMonth(month);
  const currencies = getLines(categoryId)
    .filter(
      line =>
        line.currencyCode !== defaultCurrencyCode &&
        (!line.startMonth || line.startMonth <= month),
    )
    .map(line => line.currencyCode)
    .filter(currency => {
      const lookup = findRate(
        rateIndex,
        currency,
        defaultCurrencyCode,
        monthEnd,
      );
      return !lookup || lookup.isFallback;
    });

  if (currencies.length === 0) {
    return {};
  }
  return {
    formatter: (value, type) => '≈' + format(value, type ?? 'financial'),
    title: t(
      'Approximate: no {{currencies}} exchange rate on or before the end of this month',
      { currencies: currencies.join(', ') },
    ),
  };
}

type OwnLineCurrencies = {
  // As the `currency-own-lines` preference stores them
  starts: OwnLineStarts;
  // Whether spending in `currency` gets lines of its own automatically
  isChosen: (currency: string) => boolean;
  // The currencies of open on-budget accounts other than the default, which
  // can be chosen
  accountCurrencies: string[];
};

// The currencies budgeted on lines of their own, budget-wide
export function useOwnLineCurrencies(): OwnLineCurrencies {
  const { isEnabled, defaultCurrencyCode } = useMultiCurrency();
  const [value] = useSyncedPref('currency-own-lines');
  const { data: accounts = [] } = useAccounts();

  return useMemo(() => {
    const starts = isEnabled ? parseOwnLines(value) : new Map<string, number>();
    starts.delete(defaultCurrencyCode);
    const accountCurrencies = [
      ...new Set(
        accounts
          .filter(account => !account.closed && !account.offbudget)
          .map(account =>
            getEffectiveCurrency(account.currency, defaultCurrencyCode),
          )
          .filter(
            (currency): currency is string =>
              !!currency && currency !== defaultCurrencyCode,
          ),
      ),
    ].sort();
    return {
      starts,
      isChosen: currency =>
        currency !== defaultCurrencyCode &&
        getOwnLineStart(starts, currency) != null,
      accountCurrencies,
    };
  }, [accounts, defaultCurrencyCode, isEnabled, value]);
}

// The currencies a category can be budgeted in from `month` ('YYYY-MM') on:
// those chosen to be budgeted on their own that it has no line in yet, or
// only one that starts later
export function useBudgetableCurrencies(
  categoryId: CategoryEntity['id'],
  month: string,
): string[] {
  const { getLines } = useCategoryCurrencies();
  const { starts, accountCurrencies } = useOwnLineCurrencies();
  return useMemo(() => {
    const candidates = new Set([
      ...[...starts.keys()].filter(code => code !== EVERY_CURRENCY),
      ...(starts.has(EVERY_CURRENCY) ? accountCurrencies : []),
    ]);
    const budgeted = new Set(
      getLines(categoryId)
        .filter(line => !line.startMonth || line.startMonth <= month)
        .map(line => line.currencyCode),
    );
    return [...candidates].filter(currency => !budgeted.has(currency)).sort();
  }, [accountCurrencies, categoryId, getLines, month, starts]);
}
