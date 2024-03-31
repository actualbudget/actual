import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useDebounceCallback } from 'usehooks-ts';

import { getPayees } from 'loot-core/client/actions';
import * as queries from 'loot-core/client/queries';
import { pagedQuery } from 'loot-core/client/query-helpers';
import { listen } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import { isPreviewId } from 'loot-core/shared/transactions';

import { useDateFormat } from '../../../hooks/useDateFormat';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { useNavigate } from '../../../hooks/useNavigate';
import { theme } from '../../../style';
import { Page } from '../../Page';
import { MobileBackButton } from '../MobileBackButton';
import { AddTransactionButton } from '../transactions/AddTransactionButton';
import { TransactionListWithBalances } from '../transactions/TransactionListWithBalances';

export function CategoryTransactions({ category, month }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [currentQuery, setCurrentQuery] = useState();
  const [transactions, setTransactions] = useState([]);

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [_numberFormat] = useLocalPref('numberFormat');

  const makeRootQuery = useCallback(
    () =>
      q('transactions')
        .options({ splits: 'inline' })
        .filter(getCategoryMonthFilter(category, month)),
    [category, month],
  );

  const paged = useRef(null);

  const updateQuery = useCallback(query => {
    paged.current?.unsubscribe();
    paged.current = pagedQuery(
      query.options({ splits: 'inline' }).select('*'),
      data => setTransactions(data),
      { pageCount: 10 },
    );
  }, []);

  const fetchTransactions = useCallback(async () => {
    const query = makeRootQuery();
    setCurrentQuery(query);
    updateQuery(query);
  }, [makeRootQuery, updateQuery]);

  useEffect(() => {
    function setup() {
      return listen('sync-event', ({ type, tables }) => {
        if (type === 'applied') {
          if (
            tables.includes('transactions') ||
            tables.includes('category_mapping') ||
            tables.includes('payee_mapping')
          ) {
            paged.current?.run();
          }

          if (tables.includes('payees') || tables.includes('payee_mapping')) {
            dispatch(getPayees());
          }
        }
      });
    }

    fetchTransactions();
    return setup();
  }, [dispatch, fetchTransactions]);

  const updateSearchQuery = useDebounceCallback(
    useCallback(
      searchText => {
        if (searchText === '' && currentQuery) {
          updateQuery(currentQuery);
        } else if (searchText && currentQuery) {
          updateQuery(
            queries.makeTransactionSearchQuery(
              currentQuery,
              searchText,
              dateFormat,
            ),
          );
        }
      },
      [currentQuery, dateFormat, updateQuery],
    ),
    150,
  );

  const onSearch = text => {
    updateSearchQuery(text);
  };

  const onLoadMore = () => {
    paged.current?.fetchNext();
  };

  const onSelectTransaction = transaction => {
    // details of how the native app used to handle preview transactions here can be found at commit 05e58279
    if (!isPreviewId(transaction.id)) {
      navigate(`/transactions/${transaction.id}`);
    }
  };

  const balance = queries.categoryBalance(category, month);
  const balanceCleared = queries.categoryBalanceCleared(category, month);
  const balanceUncleared = queries.categoryBalanceUncleared(category, month);

  return (
    <Page
      title={category.name}
      headerLeftContent={<MobileBackButton />}
      headerRightContent={
        <AddTransactionButton state={{ categoryId: category.id }} />
      }
      padding={0}
      style={{
        flex: 1,
        backgroundColor: theme.mobilePageBackground,
      }}
    >
      <TransactionListWithBalances
        transactions={transactions}
        balance={balance}
        balanceCleared={balanceCleared}
        balanceUncleared={balanceUncleared}
        onSearch={onSearch}
        onLoadMore={onLoadMore}
        onSelectTransaction={onSelectTransaction}
      />
    </Page>
  );
}

function getCategoryMonthFilter(category, month) {
  return {
    category: category.id,
    date: { $transform: '$month', $eq: month },
  };
}
