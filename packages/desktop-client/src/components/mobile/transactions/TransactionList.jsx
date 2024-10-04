import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch } from 'react-redux';
import { Item, Section } from 'react-stately';

import { setNotificationInset } from 'loot-core/client/actions';
import { groupById, integerToCurrency } from 'loot-core/shared/util';
import * as monthUtils from 'loot-core/src/shared/months';
import { isPreviewId } from 'loot-core/src/shared/transactions';

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
import { styles, theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Menu } from '../../common/Menu';
import { Popover } from '../../common/Popover';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { FloatingActionBar } from '../FloatingActionBar';

import { ListBox } from './ListBox';
import { Transaction } from './Transaction';

const NOTIFICATION_BOTTOM_INSET = 75;

export function TransactionList({
  isLoading,
  transactions,
  isNewTransaction,
  onOpenTransaction,
  scrollProps = {},
  onLoadMore,
}) {
  const sections = useMemo(() => {
    // Group by date. We can assume transactions is ordered
    const sections = [];
    transactions.forEach(transaction => {
      if (
        sections.length === 0 ||
        transaction.date !== sections[sections.length - 1].date
      ) {
        // Mark the last transaction in the section so it can render
        // with a different border
        const lastSection = sections[sections.length - 1];
        if (lastSection && lastSection.data.length > 0) {
          const lastData = lastSection.data;
          lastData[lastData.length - 1].isLast = true;
        }

        sections.push({
          id: `${isPreviewId(transaction.id) ? 'preview/' : ''}${transaction.date}`,
          date: transaction.date,
          data: [],
        });
      }

      sections[sections.length - 1].data.push(transaction);
    });
    return sections;
  }, [transactions]);

  const dispatchSelected = useSelectedDispatch();
  const selectedTransactions = useSelectedItems();

  const onTransactionPress = (transaction, isLongPress = false) => {
    const isPreview = isPreviewId(transaction.id);

    if (!isPreview && (isLongPress || selectedTransactions.size > 0)) {
      dispatchSelected({ type: 'select', id: transaction.id });
    } else {
      onOpenTransaction(transaction);
    }
  };

  if (isLoading) {
    return (
      <View
        aria-label="Loading..."
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <AnimatedLoading width={25} height={25} />
      </View>
    );
  }

  return (
    <>
      {scrollProps.ListHeaderComponent}
      <ListBox
        {...scrollProps}
        aria-label="Transaction list"
        label=""
        loadMore={onLoadMore}
        selectionMode="none"
      >
        {sections.length === 0 ? (
          <Section>
            <Item textValue="No transactions">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                  backgroundColor: theme.mobilePageBackground,
                }}
              >
                <Text style={{ fontSize: 15 }}>No transactions</Text>
              </div>
            </Item>
          </Section>
        ) : null}
        {sections.map(section => {
          return (
            <Section
              title={
                <span>{monthUtils.format(section.date, 'MMMM dd, yyyy')}</span>
              }
              key={section.id}
            >
              {section.data.map((transaction, index, transactions) => {
                if (isPreviewId(transaction.id) && transaction.is_child) {
                  return null;
                }

                return (
                  <Item
                    key={transaction.id}
                    style={{
                      fontSize:
                        index === transactions.length - 1 ? 98 : 'inherit',
                    }}
                    textValue={transaction.id}
                  >
                    <Transaction
                      transaction={transaction}
                      isAdded={isNewTransaction(transaction.id)}
                      isSelected={selectedTransactions.has(transaction.id)}
                      onPress={trans => onTransactionPress(trans)}
                      onLongPress={trans => onTransactionPress(trans, true)}
                    />
                  </Item>
                );
              })}
            </Section>
          );
        })}
      </ListBox>
      {selectedTransactions.size > 0 && (
        <SelectedTransactionsFloatingActionBar transactions={transactions} />
      )}
    </>
  );
}

function SelectedTransactionsFloatingActionBar({ transactions, style }) {
  const editMenuTriggerRef = useRef(null);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const moreOptionsMenuTriggerRef = useRef(null);
  const [isMoreOptionsMenuOpen, setIsMoreOptionsMenuOpen] = useState(false);
  const getMenuItemStyle = useCallback(
    item => ({
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
    dispatch(setNotificationInset({ bottom: NOTIFICATION_BOTTOM_INSET }));
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
                        displayValue = accountsById[value]?.name ?? value;
                        break;
                      case 'category':
                        displayValue = categoriesById[value]?.name ?? value;
                        break;
                      case 'payee':
                        displayValue = payeesById[value]?.name ?? value;
                        break;
                      case 'amount':
                        displayValue = integerToCurrency(value);
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
