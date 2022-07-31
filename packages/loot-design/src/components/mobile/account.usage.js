import React from 'react';
import SpreadsheetContext from '../spreadsheet/SpreadsheetContext';
import makeSpreadsheet from '@actual-app/loot-core/src/mocks/spreadsheet';
import { MobileSection, WithHeader } from '../../guide/components';
import { accounts, categories, transactions } from './accounts.usage';
import { AccountDetails } from './account';

export default () => (
  <SpreadsheetContext.Provider value={makeSpreadsheet()}>
    <MobileSection>
      Account
      <WithHeader title={accounts[0].name} style={{ backgroundColor: 'white' }}>
        <AccountDetails
          account={accounts[0]}
          categories={categories}
          transactions={transactions}
          balance={{ expr: 43598 }}
          isNewTransaction={() => false}
          onSearch={() => {}}
          onSelectTransaction={() => {}}
        />
      </WithHeader>
    </MobileSection>
  </SpreadsheetContext.Provider>
);
