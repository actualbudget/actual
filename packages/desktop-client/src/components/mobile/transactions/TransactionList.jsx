import React, { useMemo, useRef, useState } from 'react';

import { Item, Section } from '@react-stately/collections';

import * as monthUtils from 'loot-core/src/shared/months';
import { isPreviewId } from 'loot-core/src/shared/transactions';

import { AnimatedLoading } from '../../../icons/AnimatedLoading';
import { SvgDelete } from '../../../icons/v0';
import { SvgDotsHorizontalTriple } from '../../../icons/v1';
import { theme } from '../../../style';
import { Button } from '../../common/Button';
import { Menu } from '../../common/Menu';
import { Popover } from '../../common/Popover';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

import { ListBox } from './ListBox';
import { Transaction } from './Transaction';

export function TransactionList({
  isLoading,
  transactions,
  isNewTransaction,
  onSelect,
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

  const [selectedTransactions, setSelectedTransactions] = useState([]);

  const onTransactionPress = (transaction, isLongPress = false) => {
    if (isLongPress || selectedTransactions.length > 0) {
      setSelectedTransactions(prev =>
        prev.includes(transaction.id)
          ? prev.filter(id => id !== transaction.id)
          : [...prev, transaction.id],
      );
    } else {
      onSelect(transaction);
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
        <FloatingActionBar
          selectedTransactions={selectedTransactions}
          onClearSelectedTransactions={() => {
            setSelectedTransactions([]);
          }}
        />
      )}
    </>
  );
}

function FloatingActionBar({
  selectedTransactions,
  onClearSelectedTransactions,
  style,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const getMenuItemStyle = item => ({
    ...(item.name === 'delete' && { color: theme.errorTextMenu }),
  });

  return (
    <View
      style={{
        backgroundColor: theme.modalBackground,
        border: `1px solid ${theme.tableRowBackgroundHighlight}`,
        position: 'fixed',
        bottom: 10,
        margin: '0 10px',
        width: '95vw',
        height: 60,
        zIndex: 100,
        borderRadius: 8,
        ...style,
      }}
    >
      <View
        style={{
          flex: 1,
          padding: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Button
            type="bare"
            style={{ marginRight: 4 }}
            onClick={() => onClearSelectedTransactions?.()}
          >
            <SvgDelete width={10} height={10} />
          </Button>
          <Text style={{ fontWeight: 500 }}>
            {selectedTransactions.length}{' '}
            {selectedTransactions.length > 1 ? 'transactions' : 'transaction'}{' '}
            selected
          </Text>
        </View>
        <View
          style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}
        >
          <Button type="bare">Edit</Button>
          <Button type="bare">Duplicate</Button>
          <Button
            ref={triggerRef}
            type="bare"
            aria-label="Menu"
            onClick={() => {
              setMenuOpen(true);
            }}
            style={{ color: 'currentColor', padding: 3 }}
          >
            <SvgDotsHorizontalTriple
              width={15}
              height={15}
              style={{ color: theme.pageTextLight }}
            />
          </Button>

          <Popover
            triggerRef={triggerRef}
            isOpen={menuOpen}
            onOpenChange={() => setMenuOpen(false)}
            style={{ width: 200 }}
          >
            <Menu
              getItemStyle={getMenuItemStyle}
              onMenuSelect={type => {
                if (type === 'delete') {
                }
                setMenuOpen(false);
              }}
              items={[
                {
                  name: 'filter-selected',
                  text: 'Filter selected',
                },
                {
                  name: 'link-schedule',
                  text: 'Link schedule',
                },
                {
                  name: 'delete',
                  text: 'Delete',
                },
              ]}
            />
          </Popover>
        </View>
      </View>
    </View>
  );
}
