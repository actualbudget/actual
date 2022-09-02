import React from 'react';

import makeSpreadsheet from 'loot-core/src/mocks/spreadsheet';
import {
  generateAccount,
  generateCategory,
  generateTransaction
} from 'loot-core/src/mocks';

import { MobileSection } from '../../guide/components';
import SpreadsheetContext from '../spreadsheet/SpreadsheetContext';
import { AccountList } from './accounts';

export const accounts = [
  generateAccount('Bank of America', false, null, false),
  generateAccount('Wells Fargo', false, null, true),
  generateAccount('Ally', false, null, true)
];

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
      category: categories[Math.round(Math.random() * 3)].id
    })
  );
}

export default () => (
  <SpreadsheetContext.Provider value={makeSpreadsheet()}>
    <MobileSection>
      Account List
      <AccountList
        accounts={accounts}
        categories={categories}
        transactions={transactions}
        updatedAccounts={[]}
        newTransactions={[]}
        getBalanceQuery={() => ({ expr: 40000 })}
        getOnBudgetBalance={() => 30000}
        getOffBudgetBalance={() => 10000}
      />
    </MobileSection>
  </SpreadsheetContext.Provider>
);
