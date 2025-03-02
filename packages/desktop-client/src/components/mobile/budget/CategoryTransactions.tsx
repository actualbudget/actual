import React, { useCallback, useEffect, useState } from 'react';

import { TextOneLine } from '@actual-app/components/text-one-line';
import { View } from '@actual-app/components/view';

import { SchedulesProvider } from 'loot-core/client/data-hooks/schedules';
import {
  useTransactions,
  useTransactionsSearch,
} from 'loot-core/client/data-hooks/transactions';
import * as queries from 'loot-core/client/queries';
import { listen } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { isPreviewId } from 'loot-core/shared/transactions';
import {
  type CategoryEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useDateFormat } from '../../../hooks/useDateFormat';
import { useNavigate } from '../../../hooks/useNavigate';
import { useDispatch } from '../../../redux';
import { MobilePageHeader, Page } from '../../Page';
import { MobileBackButton } from '../MobileBackButton';
import { AddTransactionButton } from '../transactions/AddTransactionButton';
import { TransactionListWithBalances } from '../transactions/TransactionListWithBalances';

type CategoryTransactionsProps = {
  category: CategoryEntity;
  month: string;
};

export function CategoryTransactions({
  category,
  month,
}: CategoryTransactionsProps) {
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

  const { search: onSearch } = useTransactionsSearch({
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

  const balance = queries.categoryBalance(category, month);
  const balanceCleared = queries.categoryBalanceCleared(category, month);
  const balanceUncleared = queries.categoryBalanceUncleared(category, month);

  return (
    <Page
      header={
        <MobilePageHeader
          title={
            <View>
              <TextOneLine>{category.name}</TextOneLine>
              <TextOneLine>
                ({monthUtils.format(month, 'MMMM ‘yy')})
              </TextOneLine>
            </View>
          }
          leftContent={<MobileBackButton />}
          rightContent={<AddTransactionButton categoryId={category.id} />}
        />
      }
      padding={0}
    >
      <SchedulesProvider>
        <TransactionListWithBalances
          isLoading={isLoading}
          transactions={transactions}
          balance={balance}
          balanceCleared={balanceCleared}
          balanceUncleared={balanceUncleared}
          searchPlaceholder={`Search ${category.name}`}
          onSearch={onSearch}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMoreTransactions}
          onOpenTransaction={onOpenTransaction}
          onRefresh={undefined}
          showMakeTransfer={true}
        />
      </SchedulesProvider>
    </Page>
  );
}

function getCategoryMonthFilter(category: CategoryEntity, month: string) {
  return {
    category: category.id,
    date: { $transform: '$month', $eq: month },
  };
}
