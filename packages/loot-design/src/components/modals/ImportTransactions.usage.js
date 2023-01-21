import React from 'react';

import { generateTransactions } from 'loot-core/src/mocks';
import { TestProvider } from 'loot-core/src/mocks/redux';

import { Section, TestModal } from '../../guide/components';

import { ImportTransactions } from './ImportTransactions';

let transactions = generateTransactions(20, 'acct', 'group');
// The mocks generate "internal" transactions... but we need the
// "public" shape. Will reconcile this difference over time.
transactions = transactions.map(trans => ({
  amount: trans.amount,
  date: trans.date,
  payee: trans.description,
  imported_payee: trans.description,
  notes: trans.notes
}));

export default () => (
  <Section>
    Import Transactions Modal
    <TestProvider>
      <TestModal width={1000} height={600}>
        {node => (
          <ImportTransactions
            modalProps={{ isCurrent: true, parent: node }}
            options={{ filename: 'file.csv' }}
            parseTransactions={filename => ({
              errors: [],
              transactions
            })}
            prefs={{}}
          />
        )}
      </TestModal>
    </TestProvider>
  </Section>
);
