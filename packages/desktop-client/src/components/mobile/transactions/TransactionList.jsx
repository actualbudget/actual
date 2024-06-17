import React, { useMemo, useState } from 'react';

import { Item, Section } from '@react-stately/collections';

import * as monthUtils from 'loot-core/src/shared/months';
import { isPreviewId } from 'loot-core/src/shared/transactions';

import { AnimatedLoading } from '../../../icons/AnimatedLoading';
import { theme } from '../../../style';
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

  const [selectedTransactions, setSelectedTransaction] = useState([]);

  const onTransactionPress = (transaction, isLongPress = false) => {
    if (isLongPress || selectedTransactions.length > 0) {
      setSelectedTransaction(prev =>
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
    </>
  );
}
