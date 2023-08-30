import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';

import debounce from 'debounce';
import memoizeOne from 'memoize-one';
import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import {
  SchedulesProvider,
  useCachedSchedules,
} from 'loot-core/src/client/data-hooks/schedules';
import * as queries from 'loot-core/src/client/queries';
import { pagedQuery } from 'loot-core/src/client/query-helpers';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import {
  isPreviewId,
  ungroupTransactions,
} from 'loot-core/src/shared/transactions';

import { useActions } from '../../hooks/useActions';
import useCategories from '../../hooks/useCategories';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';
import { theme } from '../../style';
import SyncRefresh from '../SyncRefresh';

import AccountDetails from './MobileAccountDetails';

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

function PreviewTransactions({ accountId, children }) {
  let scheduleData = useCachedSchedules();

  if (scheduleData == null) {
    return children(null);
  }

  let schedules = scheduleData.schedules.filter(
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

let paged;

export default function Account(props) {
  const accounts = useSelector(state => state.queries.accounts);
  const { syncAndDownload } = useActions();

  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [currentQuery, setCurrentQuery] = useState();

  let state = useSelector(state => ({
    payees: state.queries.payees,
    newTransactions: state.queries.newTransactions,
    prefs: state.prefs.local,
    dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
  }));

  let dispatch = useDispatch();
  let actionCreators = useMemo(
    () => bindActionCreators(actions, dispatch),
    [dispatch],
  );

  const { id: accountId } = useParams();

  const makeRootQuery = () => queries.makeTransactionsQuery(accountId);

  const updateQuery = query => {
    if (paged) {
      paged.unsubscribe();
    }

    paged = pagedQuery(
      query.options({ splits: 'grouped' }).select('*'),
      data => setTransactions(data),
      { pageCount: 150, mapper: ungroupTransactions },
    );
  };

  const fetchTransactions = async () => {
    let query = makeRootQuery();
    setCurrentQuery(query);
    updateQuery(query);
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
            paged?.run();
          }

          if (tables.includes('payees') || tables.includes('payee_mapping')) {
            actionCreators.getPayees();
          }
        }
      });

      if (accounts.length === 0) {
        await actionCreators.getAccounts();
      }

      await actionCreators.initiallyLoadPayees();
      await fetchTransactions();

      actionCreators.markAccountRead(accountId);
    }

    setUpAccount();

    return () => unlisten();
  }, []);

  // Load categories if necessary.
  const categories = useCategories();

  const updateSearchQuery = debounce(() => {
    if (searchText === '' && currentQuery) {
      updateQuery(currentQuery);
    } else if (searchText && currentQuery) {
      updateQuery(
        queries.makeTransactionSearchQuery(
          currentQuery,
          searchText,
          state.dateFormat,
        ),
      );
    }
  }, 150);

  useEffect(updateSearchQuery, [searchText, currentQuery, state.dateFormat]);

  // theme-color meta tag does not support CSS variables
  useSetThemeColor(theme.mobileAccountsPageTheme);

  if (!accounts || !accounts.length) {
    return null;
  }

  const account = accounts.find(acct => acct.id === accountId);

  const isNewTransaction = id => {
    return state.newTransactions.includes(id);
  };

  const onSearch = async text => {
    paged.unsubscribe();
    setSearchText(text);
  };

  const onSelectTransaction = transaction => {
    if (isPreviewId(transaction.id)) {
      let parts = transaction.id.split('/');
      let scheduleId = parts[1];

      let options = ['Post transaction', 'Skip scheduled date', 'Cancel'];
      let cancelButtonIndex = 2;

      props.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
        },
        buttonIndex => {
          switch (buttonIndex) {
            case 0:
              // Post
              send('schedule/post-transaction', { id: scheduleId });
              break;
            case 1:
              // Skip
              send('schedule/skip-next-date', { id: scheduleId });
              break;
            default:
          }
        },
      );
    } else {
      navigate(`transactions/${transaction.id}`);
    }
  };

  const onRefresh = async () => {
    await syncAndDownload();
  };

  let balance = queries.accountBalance(account);
  let numberFormat = state.prefs.numberFormat || 'comma-dot';
  let hideFraction = state.prefs.hideFraction || false;

  return (
    <SyncRefresh onSync={onRefresh}>
      {({ refreshing, onRefresh }) => (
        <SchedulesProvider
          transform={getSchedulesTransform(accountId, searchText !== '')}
        >
          <PreviewTransactions accountId={props.accountId}>
            {prependTransactions =>
              prependTransactions == null ? null : (
                <AccountDetails
                  // This key forces the whole table rerender when the number
                  // format changes
                  {...state}
                  {...actionCreators}
                  key={numberFormat + hideFraction}
                  account={account}
                  accounts={accounts}
                  categories={categories.list}
                  payees={state.payees}
                  transactions={transactions}
                  prependTransactions={prependTransactions || []}
                  balance={balance}
                  isNewTransaction={isNewTransaction}
                  // refreshControl={
                  //   <RefreshControl
                  //     refreshing={refreshing}
                  //     onRefresh={onRefresh}
                  //   />
                  // }
                  onLoadMore={() => {
                    paged?.fetchNext();
                  }}
                  onSearch={onSearch}
                  onSelectTransaction={onSelectTransaction}
                />
              )
            }
          </PreviewTransactions>
        </SchedulesProvider>
      )}
    </SyncRefresh>
  );
}
