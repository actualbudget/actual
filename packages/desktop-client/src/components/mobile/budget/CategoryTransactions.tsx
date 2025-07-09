import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { TextOneLine } from '@actual-app/components/text-one-line';
import { View } from '@actual-app/components/view';

import { listen } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { isPreviewId } from 'loot-core/shared/transactions';
import {
  type CategoryEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { AddTransactionButton } from '@desktop-client/components/mobile/transactions/AddTransactionButton';
import { TransactionListWithBalances } from '@desktop-client/components/mobile/transactions/TransactionListWithBalances';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useCategoryPreviewTransactions } from '@desktop-client/hooks/useCategoryPreviewTransactions';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { useTransactionsSearch } from '@desktop-client/hooks/useTransactionsSearch';
import { useDispatch } from '@desktop-client/redux';
import * as bindings from '@desktop-client/spreadsheet/bindings';

type CategoryTransactionsProps = {
  category: CategoryEntity;
  month: string;
};

export function CategoryTransactions({
  category,
  month,
}: CategoryTransactionsProps) {
  const locale = useLocale();

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);

  return (
    <Page
      header={
        <MobilePageHeader
          title={
            <View>
              <TextOneLine>{category.name}</TextOneLine>
              <TextOneLine>
                ({monthUtils.format(month, 'MMMM ‘yy', locale)})
              </TextOneLine>
            </View>
          }
          leftContent={<MobileBackButton />}
          rightContent={<AddTransactionButton categoryId={category.id} />}
        />
      }
      padding={0}
    >
      <SchedulesProvider query={schedulesQuery}>
        <TransactionListWithPreviews category={category} month={month} />
      </SchedulesProvider>
    </Page>
  );
}

type TransactionListWithPreviewsProps = {
  category: CategoryEntity;
  month: string;
};

function TransactionListWithPreviews({
  category,
  month,
}: TransactionListWithPreviewsProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const baseTransactionsQuery = useCallback(
    () =>
      q('transactions')
        .options({ splits: 'inline' })
        .filter(getCategoryMonthFilter(category, month))
        .select('*'),
    [category, month],
  );

  const [transactionsQuery, setTransactionsQuery] = useState(
    baseTransactionsQuery(),
  );
  const {
    transactions,
    isLoading,
    isLoadingMore,
    loadMore: loadMoreTransactions,
    reload: reloadTransactions,
  } = useTransactions({
    query: transactionsQuery,
  });

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  useEffect(() => {
    return listen('sync-event', event => {
      if (event.type === 'applied') {
        const tables = event.tables;
        if (
          tables.includes('transactions') ||
          tables.includes('category_mapping') ||
          tables.includes('payee_mapping')
        ) {
          reloadTransactions();
        }
      }
    });
  }, [dispatch, reloadTransactions]);

  const { isSearching, search: onSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
  });

  const onOpenTransaction = useCallback(
    (transaction: TransactionEntity) => {
      // details of how the native app used to handle preview transactions here can be found at commit 05e58279
      if (!isPreviewId(transaction.id)) {
        navigate(`/transactions/${transaction.id}`);
      }
    },
    [navigate],
  );

  const balance = bindings.categoryBalance(category.id, month);
  const balanceCleared = bindings.categoryBalanceCleared(category.id, month);
  const balanceUncleared = bindings.categoryBalanceUncleared(
    category.id,
    month,
  );

  const { previewTransactions } = useCategoryPreviewTransactions({
    categoryId: category.id,
    month,
  });

  const transactionsToDisplay = !isSearching
    ? previewTransactions.concat(transactions)
    : transactions;

  return (
    <TransactionListWithBalances
      isLoading={isLoading}
      transactions={transactionsToDisplay}
      balance={balance}
      balanceCleared={balanceCleared}
      balanceUncleared={balanceUncleared}
      runningBalances={undefined}
      searchPlaceholder={`Search ${category.name}`}
      onSearch={onSearch}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMoreTransactions}
      onOpenTransaction={onOpenTransaction}
      onRefresh={undefined}
      account={undefined}
    />
  );
}

function getCategoryMonthFilter(category: CategoryEntity, month: string) {
  return {
    category: category.id,
    date: { $transform: '$month', $eq: month },
  };
}
