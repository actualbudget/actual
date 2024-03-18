import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import memoizeOne from 'memoize-one';
import { useDebounceCallback } from 'usehooks-ts';

import * as actions from 'loot-core/src/client/actions';
import {
  SchedulesProvider,
  useCachedSchedules,
} from 'loot-core/src/client/data-hooks/schedules';
import * as queries from 'loot-core/src/client/queries';
import { pagedQuery } from 'loot-core/src/client/query-helpers';
import { listen, send } from 'loot-core/src/platform/client/fetch';
import {
  isPreviewId,
  ungroupTransactions,
} from 'loot-core/src/shared/transactions';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { useLocalPrefs } from '../../../hooks/useLocalPrefs';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePayees } from '../../../hooks/usePayees';
import { useSetThemeColor } from '../../../hooks/useSetThemeColor';
import { theme, styles } from '../../../style';
import { Button } from '../../common/Button';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

import { AccountDetails } from './AccountDetails';

const getSchedulesTransform = memoizeOne((id, hasSearch) => {
  let filter = queries.getAccountFilter(id, '_account');

  // Never show schedules on these pages
  if (hasSearch) {
    filter = { id: null };
  }

  return q => {
    q = q.filter({ $and: [filter, { '_account.closed': false }] });
    return q.orderBy({ next_date: 'desc' });
  };
});

function PreviewTransactions({ children }) {
  const scheduleData = useCachedSchedules();

  if (scheduleData == null) {
    return children(null);
  }

  const schedules = scheduleData.schedules.filter(
    s =>
      !s.completed &&
      ['due', 'upcoming', 'missed'].includes(scheduleData.statuses.get(s.id)),
  );

  return children(
    schedules.map(schedule => ({
      id: 'preview/' + schedule.id,
      payee: schedule._payee,
      account: schedule._account,
      amount: schedule._amount,
      date: schedule.next_date,
      notes: scheduleData.statuses.get(schedule.id),
      schedule: schedule.id,
    })),
  );
}

export function Account(props) {
  const accounts = useAccounts();
  const payees = usePayees();

  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentQuery, setCurrentQuery] = useState();

  const newTransactions = useSelector(state => state.queries.newTransactions);
  const prefs = useLocalPrefs();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [_numberFormat] = useLocalPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction = false] = useLocalPref('hideFraction');

  const state = {
    payees,
    newTransactions,
    prefs,
    dateFormat,
  };

  const dispatch = useDispatch();

  const { id: accountId } = useParams();

  const makeRootQuery = useCallback(
    () => queries.makeTransactionsQuery(accountId),
    [accountId],
  );

  const paged = useRef(null);

  const updateQuery = useCallback(query => {
    paged.current?.unsubscribe();
    paged.current = pagedQuery(
      query.options({ splits: 'grouped' }).select('*'),
      data => setTransactions(data),
      { pageCount: 10, mapper: ungroupTransactions },
    );
  }, []);

  const fetchTransactions = useCallback(async () => {
    const query = makeRootQuery();
    setCurrentQuery(query);
    updateQuery(query);
  }, [makeRootQuery, updateQuery]);

  const refetchTransactions = () => {
    paged.current?.run();
  };

  useEffect(() => {
    let unlisten;

    async function setUpAccount() {
      unlisten = listen('sync-event', ({ type, tables }) => {
        if (type === 'applied') {
          if (
            tables.includes('transactions') ||
            tables.includes('category_mapping') ||
            tables.includes('payee_mapping')
          ) {
            refetchTransactions();
          }

          if (tables.includes('payees') || tables.includes('payee_mapping')) {
            dispatch(actions.getPayees());
          }
        }
      });

      await fetchTransactions();

      dispatch(actions.markAccountRead(accountId));
    }

    setUpAccount();

    return () => unlisten();
  }, [accountId, dispatch, fetchTransactions]);

  // Load categories if necessary.
  const categories = useCategories();

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

        setIsSearching(searchText !== '');
      },
      [currentQuery, dateFormat, updateQuery],
    ),
    150,
  );

  useSetThemeColor(theme.mobileViewTheme);

  if (!accounts || !accounts.length) {
    return null;
  }

  if (
    accountId === 'budgeted' ||
    accountId === 'offbudget' ||
    accountId === 'uncategorized'
  ) {
    return (
      <View style={{ flex: 1, padding: 30 }}>
        <Text style={(styles.text, { textAlign: 'center' })}>
          There is no Mobile View at the moment
        </Text>
        <Button
          type="normal"
          style={{ fontSize: 15, marginLeft: 10, marginTop: 10 }}
          onClick={() => navigate('/accounts')}
        >
          Go back to Mobile Accounts
        </Button>
      </View>
    );
  }

  const account = accounts.find(acct => acct.id === accountId);

  const isNewTransaction = id => {
    return state.newTransactions.includes(id);
  };

  const onSearch = text => {
    updateSearchQuery(text);
  };

  const onSelectTransaction = transaction => {
    // details of how the native app used to handle preview transactions here can be found at commit 05e58279
    if (!isPreviewId(transaction.id)) {
      navigate(`transactions/${transaction.id}`);
    } else {
      dispatch(
        actions.pushModal('scheduled-transaction-menu', {
          transactionId: transaction.id,
          onPost: async transactionId => {
            const parts = transactionId.split('/');
            await send('schedule/post-transaction', { id: parts[1] });
            refetchTransactions();
            dispatch(actions.collapseModals('scheduled-transaction-menu'));
          },
          onSkip: async transactionId => {
            const parts = transactionId.split('/');
            await send('schedule/skip-next-date', { id: parts[1] });
            dispatch(actions.collapseModals('scheduled-transaction-menu'));
          },
        }),
      );
    }
  };

  const balance = queries.accountBalance(account);
  const balanceCleared = queries.accountBalanceCleared(account);
  const balanceUncleared = queries.accountBalanceUncleared(account);

  return (
    <SchedulesProvider
      transform={getSchedulesTransform(accountId, isSearching)}
    >
      <PreviewTransactions accountId={props.accountId}>
        {prependTransactions =>
          prependTransactions == null ? null : (
            <AccountDetails
              // This key forces the whole table rerender when the number
              // format changes
              {...state}
              key={numberFormat + hideFraction}
              account={account}
              accounts={accounts}
              categories={categories.list}
              payees={state.payees}
              transactions={transactions}
              prependTransactions={prependTransactions || []}
              balance={balance}
              balanceCleared={balanceCleared}
              balanceUncleared={balanceUncleared}
              isNewTransaction={isNewTransaction}
              onLoadMore={() => {
                paged.current?.fetchNext();
              }}
              onSearch={onSearch}
              onSelectTransaction={onSelectTransaction}
            />
          )
        }
      </PreviewTransactions>
    </SchedulesProvider>
  );
}
