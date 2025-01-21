import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { ListBox, Section, Header, Collection } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { setNotificationInset } from 'loot-core/client/notifications/notificationsSlice';
import { groupById, integerToCurrency } from 'loot-core/shared/util';
import * as monthUtils from 'loot-core/src/shared/months';
import { isPreviewId } from 'loot-core/src/shared/transactions';
import { type TransactionEntity } from 'loot-core/types/models/transaction';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePayees } from '../../../hooks/usePayees';
import {
  useSelectedDispatch,
  useSelectedItems,
} from '../../../hooks/useSelected';
import { useTransactionBatchActions } from '../../../hooks/useTransactionBatchActions';
import { useUndo } from '../../../hooks/useUndo';
import { AnimatedLoading } from '../../../icons/AnimatedLoading';
import { SvgDelete } from '../../../icons/v0';
import { SvgDotsHorizontalTriple } from '../../../icons/v1';
import { useDispatch } from '../../../redux';
import { styles, theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Menu, type MenuItemObject } from '../../common/Menu';
import { Popover } from '../../common/Popover';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { useScrollListener } from '../../ScrollProvider';
import { FloatingActionBar } from '../FloatingActionBar';

import { TransactionListItem } from './TransactionListItem';

const NOTIFICATION_BOTTOM_INSET = 75;

type LoadingProps = {
  style?: CSSProperties;
  'aria-label': string;
};

function Loading({ style, 'aria-label': ariaLabel }: LoadingProps) {
  return (
    <View
      aria-label={ariaLabel || 'Loading...'}
      style={{
        backgroundColor: theme.mobilePageBackground,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        ...style,
      }}
    >
      <AnimatedLoading width={25} height={25} />
    </View>
  );
}

type TransactionListProps = {
  isLoading: boolean;
  transactions: readonly TransactionEntity[];
  onOpenTransaction?: (transaction: TransactionEntity) => void;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

export function TransactionList({
  isLoading,
  transactions,
  onOpenTransaction,
  isLoadingMore,
  onLoadMore,
}: TransactionListProps) {
  const { t } = useTranslation();
  const sections = useMemo(() => {
    // Group by date. We can assume transactions is ordered
    const sections: {
      id: string;
      date: TransactionEntity['date'];
      transactions: TransactionEntity[];
    }[] = [];
    transactions.forEach(transaction => {
      if (
        sections.length === 0 ||
        transaction.date !== sections[sections.length - 1].date
      ) {
        sections.push({
          id: `${isPreviewId(transaction.id) ? 'preview/' : ''}${transaction.date}`,
          date: transaction.date,
          transactions: [],
        });
      }

      sections[sections.length - 1].transactions.push(transaction);
    });
    return sections;
  }, [transactions]);

  const dispatchSelected = useSelectedDispatch();
  const selectedTransactions = useSelectedItems();

  const onTransactionPress: (
    transaction: TransactionEntity,
    isLongPress?: boolean,
  ) => void = useCallback(
    (transaction, isLongPress = false) => {
      const isPreview = isPreviewId(transaction.id);
      if (!isPreview && (isLongPress || selectedTransactions.size > 0)) {
        dispatchSelected({ type: 'select', id: transaction.id });
      } else {
        onOpenTransaction?.(transaction);
      }
    },
    [dispatchSelected, onOpenTransaction, selectedTransactions],
  );

  useScrollListener(({ hasScrolledToEnd }) => {
    if (hasScrolledToEnd('down', 100)) {
      onLoadMore?.();
    }
  });

  if (isLoading) {
    return <Loading aria-label={t('Loading transactions...')} />;
  }

  return (
    <>
      <ListBox
        aria-label={t('Transaction list')}
        selectionMode={selectedTransactions.size > 0 ? 'multiple' : 'single'}
        selectedKeys={selectedTransactions}
        dependencies={[selectedTransactions]}
        renderEmptyState={() => (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.mobilePageBackground,
            }}
          >
            <Text style={{ fontSize: 15 }}>No transactions</Text>
          </View>
        )}
        items={sections}
      >
        {section => (
          <Section>
            <Header
              style={{
                ...styles.smallText,
                backgroundColor: theme.pageBackground,
                color: theme.tableHeaderText,
                display: 'flex',
                justifyContent: 'center',
                paddingBottom: 4,
                paddingTop: 4,
                position: 'sticky',
                top: '0',
                width: '100%',
                zIndex: 10,
              }}
            >
              {monthUtils.format(section.date, 'MMMM dd, yyyy')}
            </Header>
            <Collection
              items={section.transactions.filter(
                t => !isPreviewId(t.id) || !t.is_child,
              )}
              addIdAndValue
            >
              {transaction => (
                <TransactionListItem
                  key={transaction.id}
                  value={transaction}
                  onPress={trans => onTransactionPress(trans)}
                  onLongPress={trans => onTransactionPress(trans, true)}
                />
              )}
            </Collection>
          </Section>
        )}
      </ListBox>

      {isLoadingMore && (
        <Loading
          aria-label={t('Loading more transactions...')}
          style={{
            // Same height as transaction list item
            height: 60,
          }}
        />
      )}

      {selectedTransactions.size > 0 && (
        <SelectedTransactionsFloatingActionBar transactions={transactions} />
      )}
    </>
  );
}

type SelectedTransactionsFloatingActionBarProps = {
  transactions: readonly TransactionEntity[];
  style?: CSSProperties;
};

function SelectedTransactionsFloatingActionBar({
  transactions,
  style = {},
}: SelectedTransactionsFloatingActionBarProps) {
  const editMenuTriggerRef = useRef(null);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const moreOptionsMenuTriggerRef = useRef(null);
  const [isMoreOptionsMenuOpen, setIsMoreOptionsMenuOpen] = useState(false);
  const getMenuItemStyle = useCallback(
    <T extends string>(item: MenuItemObject<T>) => ({
      ...styles.mobileMenuItem,
      color: theme.mobileHeaderText,
      ...(item.name === 'delete' && { color: theme.errorTextMenu }),
    }),
    [],
  );
  const selectedTransactions = useSelectedItems();
  const selectedTransactionsArray = Array.from(selectedTransactions);
  const dispatchSelected = useSelectedDispatch();

  const buttonProps = useMemo(
    () => ({
      style: {
        ...styles.mobileMenuItem,
        color: 'currentColor',
        height: styles.mobileMinHeight,
      },
      activeStyle: {
        color: 'currentColor',
      },
      hoveredStyle: {
        color: 'currentColor',
      },
    }),
    [],
  );

  const allTransactionsAreLinked = useMemo(() => {
    return transactions
      .filter(t => selectedTransactions.has(t.id))
      .every(t => t.schedule);
  }, [transactions, selectedTransactions]);

  const isMoreThanOne = selectedTransactions.size > 1;

  const { showUndoNotification } = useUndo();
  const {
    onBatchEdit,
    onBatchDuplicate,
    onBatchDelete,
    onBatchLinkSchedule,
    onBatchUnlinkSchedule,
  } = useTransactionBatchActions();

  const navigate = useNavigate();
  const accounts = useAccounts();
  const accountsById = useMemo(() => groupById(accounts), [accounts]);

  const payees = usePayees();
  const payeesById = useMemo(() => groupById(payees), [payees]);

  const { list: categories } = useCategories();
  const categoriesById = useMemo(() => groupById(categories), [categories]);

  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(
      setNotificationInset({ inset: { bottom: NOTIFICATION_BOTTOM_INSET } }),
    );
    return () => {
      dispatch(setNotificationInset(null));
    };
  }, [dispatch]);

  return (
    <FloatingActionBar style={style}>
      <View
        style={{
          flex: 1,
          padding: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <Button
            variant="bare"
            {...buttonProps}
            style={{ ...buttonProps.style, marginRight: 4 }}
            onPress={() => {
              if (selectedTransactions.size > 0) {
                dispatchSelected({ type: 'select-none' });
              }
            }}
          >
            <SvgDelete width={10} height={10} />
          </Button>
          <Text style={styles.mediumText}>
            {selectedTransactions.size}{' '}
            {isMoreThanOne ? 'transactions' : 'transaction'} selected
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 4,
          }}
        >
          <Button
            variant="bare"
            ref={editMenuTriggerRef}
            aria-label="Edit fields"
            onPress={() => {
              setIsEditMenuOpen(true);
            }}
            {...buttonProps}
          >
            Edit
          </Button>

          <Popover
            triggerRef={editMenuTriggerRef}
            isOpen={isEditMenuOpen}
            onOpenChange={() => setIsEditMenuOpen(false)}
            style={{ width: 200 }}
          >
            <Menu
              getItemStyle={getMenuItemStyle}
              style={{ backgroundColor: theme.floatingActionBarBackground }}
              onMenuSelect={name => {
                onBatchEdit?.({
                  name,
                  ids: selectedTransactionsArray,
                  onSuccess: (ids, name, value, mode) => {
                    let displayValue = value;
                    switch (name) {
                      case 'account':
                        displayValue =
                          accountsById[String(value)]?.name ?? value;
                        break;
                      case 'category':
                        displayValue =
                          categoriesById[String(value)]?.name ?? value;
                        break;
                      case 'payee':
                        displayValue = payeesById[String(value)]?.name ?? value;
                        break;
                      case 'amount':
                        displayValue = Number.isNaN(Number(value))
                          ? value
                          : integerToCurrency(Number(value));
                        break;
                      case 'notes':
                        displayValue = `${mode} with ${value}`;
                        break;
                      default:
                        displayValue = value;
                        break;
                    }

                    showUndoNotification({
                      message: `Successfully updated ${name} of ${ids.length} transaction${ids.length > 1 ? 's' : ''} to [${displayValue}](#${displayValue}).`,
                      messageActions: {
                        [String(displayValue)]: () => {
                          switch (name) {
                            case 'account':
                              navigate(`/accounts/${value}`);
                              break;
                            case 'category':
                              navigate(`/categories/${value}`);
                              break;
                            case 'payee':
                              navigate(`/payees`);
                              break;
                            default:
                              break;
                          }
                        },
                      },
                    });
                  },
                });
                setIsEditMenuOpen(false);
              }}
              items={[
                // Add support later on.
                // Pikaday doesn't play well will mobile.
                // We should consider switching to react-aria date picker.
                // {
                //   name: 'date',
                //   text: 'Date',
                // },
                {
                  name: 'account',
                  text: 'Account',
                },
                {
                  name: 'payee',
                  text: 'Payee',
                },
                {
                  name: 'notes',
                  text: 'Notes',
                },
                {
                  name: 'category',
                  text: 'Category',
                },
                // Add support later on until we have more user friendly amount input modal.
                // {
                //   name: 'amount',
                //   text: 'Amount',
                // },
                {
                  name: 'cleared',
                  text: 'Cleared',
                },
              ]}
            />
          </Popover>

          <Button
            variant="bare"
            ref={moreOptionsMenuTriggerRef}
            aria-label="More options"
            onPress={() => {
              setIsMoreOptionsMenuOpen(true);
            }}
            {...buttonProps}
          >
            <SvgDotsHorizontalTriple
              width={16}
              height={16}
              style={{ color: 'currentColor' }}
            />
          </Button>

          <Popover
            triggerRef={moreOptionsMenuTriggerRef}
            isOpen={isMoreOptionsMenuOpen}
            onOpenChange={() => setIsMoreOptionsMenuOpen(false)}
            style={{ width: 200 }}
          >
            <Menu
              getItemStyle={getMenuItemStyle}
              style={{ backgroundColor: theme.floatingActionBarBackground }}
              onMenuSelect={type => {
                if (type === 'duplicate') {
                  onBatchDuplicate?.({
                    ids: selectedTransactionsArray,
                    onSuccess: ids => {
                      showUndoNotification({
                        message: `Successfully duplicated ${ids.length} transaction${ids.length > 1 ? 's' : ''}.`,
                      });
                    },
                  });
                } else if (type === 'link-schedule') {
                  onBatchLinkSchedule?.({
                    ids: selectedTransactionsArray,
                    onSuccess: (ids, schedule) => {
                      // TODO: When schedule becomes available in mobile, update undo notification message
                      // with `messageActions` to open the schedule when the schedule name is clicked.
                      showUndoNotification({
                        message: `Successfully linked ${ids.length} transaction${ids.length > 1 ? 's' : ''} to ${schedule.name}.`,
                      });
                    },
                  });
                } else if (type === 'unlink-schedule') {
                  onBatchUnlinkSchedule?.({
                    ids: selectedTransactionsArray,
                    onSuccess: ids => {
                      showUndoNotification({
                        message: `Successfully unlinked ${ids.length} transaction${ids.length > 1 ? 's' : ''} from their respective schedules.`,
                      });
                    },
                  });
                } else if (type === 'delete') {
                  onBatchDelete?.({
                    ids: selectedTransactionsArray,
                    onSuccess: ids => {
                      showUndoNotification({
                        type: 'warning',
                        message: `Successfully deleted ${ids.length} transaction${ids.length > 1 ? 's' : ''}.`,
                      });
                    },
                  });
                }
                setIsMoreOptionsMenuOpen(false);
              }}
              items={[
                {
                  name: 'duplicate',
                  text: 'Duplicate',
                },
                ...(allTransactionsAreLinked
                  ? [
                      {
                        name: 'unlink-schedule',
                        text: 'Unlink schedule',
                      },
                    ]
                  : [
                      {
                        name: 'link-schedule',
                        text: 'Link schedule',
                      },
                    ]),
                {
                  name: 'delete',
                  text: 'Delete',
                },
              ]}
            />
          </Popover>
        </View>
      </View>
    </FloatingActionBar>
  );
}
