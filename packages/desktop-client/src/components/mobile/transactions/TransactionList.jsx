import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Item, Section } from '@react-stately/collections';

import * as monthUtils from 'loot-core/src/shared/months';
import { isPreviewId } from 'loot-core/src/shared/transactions';

import { AnimatedLoading } from '../../../icons/AnimatedLoading';
import { SvgDelete } from '../../../icons/v0';
import { SvgDotsHorizontalTriple } from '../../../icons/v1';
import { styles, theme } from '../../../style';
import { Button } from '../../common/Button';
import { Menu } from '../../common/Menu';
import { Popover } from '../../common/Popover';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { FloatingActionBar } from '../FloatingActionBar';

import { ListBox } from './ListBox';
import { Transaction } from './Transaction';

export function TransactionList({
  isLoading,
  transactions,
  selectedTransactions = [],
  onAddSelectedTransaction,
  onClearSelectedTransactions,
  isNewTransaction,
  onOpenTransaction,
  scrollProps = {},
  onLoadMore,
  onBatchEdit,
  onBatchDuplicate,
  onSetTransfer,
  onLinkSchedule,
  onUnlinkSchedule,
  onBatchDelete,
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

  const onTransactionPress = (transaction, isLongPress = false) => {
    const isPreview = isPreviewId(transaction.id);

    if (!isPreview && (isLongPress || selectedTransactions.length > 0)) {
      onAddSelectedTransaction(transaction.id);
    } else {
      onOpenTransaction(transaction);
    }
  };

  if (isLoading) {
    return (
      <View
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
        aria-label="transaction list"
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
                      isSelected={selectedTransactions.includes(transaction.id)}
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
      {selectedTransactions?.length > 0 && (
        <SelectedTransactionsFloatingActionBar
          transactions={transactions}
          selectedTransactions={selectedTransactions}
          onClearSelectedTransactions={onClearSelectedTransactions}
          onEdit={onBatchEdit}
          onDuplicate={onBatchDuplicate}
          onLinkSchedule={onLinkSchedule}
          onUnlinkSchedule={onUnlinkSchedule}
          onSetTransfer={onSetTransfer}
          onDelete={onBatchDelete}
        />
      )}
    </>
  );
}

function SelectedTransactionsFloatingActionBar({
  transactions,
  selectedTransactions,
  onClearSelectedTransactions,
  onEdit,
  onDuplicate,
  onLinkSchedule,
  onUnlinkSchedule,
  onDelete,
  style,
}) {
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
      .filter(t => selectedTransactions.includes(t.id))
      .every(t => t.schedule);
  }, [transactions, selectedTransactions]);

  const isMoreThanOne = selectedTransactions.length > 1;

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
            type="bare"
            {...buttonProps}
            style={{ ...buttonProps.style, marginRight: 4 }}
            onClick={() => {
              if (selectedTransactions.length > 0) {
                onClearSelectedTransactions();
              }
            }}
          >
            <SvgDelete width={10} height={10} />
          </Button>
          <Text style={styles.mediumText}>
            {selectedTransactions.length}{' '}
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
            type="bare"
            ref={editMenuTriggerRef}
            aria-label="Edit fields"
            onClick={() => {
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
              onMenuSelect={type => {
                onEdit?.(type, selectedTransactions);
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
                {
                  name: 'amount',
                  text: 'Amount',
                },
                {
                  name: 'cleared',
                  text: 'Cleared',
                },
              ]}
            />
          </Popover>

          <Button
            type="bare"
            ref={moreOptionsMenuTriggerRef}
            aria-label="More options"
            onClick={() => {
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
                  onDuplicate?.(selectedTransactions);
                } else if (type === 'link-schedule') {
                  onLinkSchedule?.(selectedTransactions);
                } else if (type === 'unlink-schedule') {
                  onUnlinkSchedule?.(selectedTransactions);
                } else if (type === 'delete') {
                  onDelete?.(selectedTransactions);
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
