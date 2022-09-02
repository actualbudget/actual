import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  generateAccount,
  generateCategory,
  generateTransaction
} from 'loot-core/src/mocks';

import { Section, MobileSection } from '../../guide/components';
import { TransactionList, TransactionEdit } from './transaction';
import { colors } from '../../style';

export const accounts = [generateAccount('Checking')];

export const categories = [
  generateCategory('Food'),
  generateCategory('Bills'),
  generateCategory('Big Projects'),
  generateCategory('Other Stuff')
];

export let transactions = [];
for (let i = 0; i < 100; i++) {
  transactions.push.apply(
    transactions,
    generateTransaction({
      acct: accounts[0].id,
      category: categories[Math.round(Math.random() * 3)].id,
      date: monthUtils.subDays(monthUtils.currentDay(), Math.random() * 100)
    })
  );
}
transactions.sort((t1, t2) => {
  return monthUtils.isBefore(t1.date, t2.date)
    ? 1
    : monthUtils.isAfter(t1.date, t2.date)
    ? -1
    : 0;
});
transactions[1].description =
  'A really long one to test to see what happens when there iss too much';

export default () => (
  <Section>
    Transactions
    <MobileSection>
      <TransactionList
        categories={categories}
        transactions={transactions}
        isNew={() => false}
      />
    </MobileSection>
    Transaction Edit
    <MobileSection style={{ backgroundColor: colors.p6, paddingTop: 5 }}>
      <TransactionEdit
        transactions={[transactions[0]]}
        categories={categories}
        accounts={accounts}
        onCancel={() => {}}
      />
    </MobileSection>
  </Section>
);
