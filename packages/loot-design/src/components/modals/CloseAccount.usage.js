import React from 'react';
import { MemoryRouter as Router } from 'react-router-dom';

import { generateAccount, generateCategoryGroups } from 'loot-core/src/mocks';

import { Section, TestModal } from '../../guide/components';

import CloseAccount from './CloseAccount';

const accounts = [
  generateAccount('Bank of America', null, null, false),
  generateAccount('Wells Fargo', null, null, false),
  generateAccount('Ally', null, null, false),
  generateAccount('Savings', null, null, true),
  generateAccount('Another', null, null, true)
];

const categoryGroups = generateCategoryGroups([
  {
    name: 'Investments and Savings',
    categories: [{ name: 'Savings' }]
  },
  {
    name: 'Usual Expenses',
    categories: [{ name: 'Food' }, { name: 'General' }, { name: 'Home' }]
  },
  {
    name: 'Projects',
    categories: [{ name: 'Big Projects' }, { name: 'Shed' }]
  }
]);

export default () => (
  <Router>
    <Section>
      Close Account Modal
      <TestModal width={700} height={600}>
        {node => (
          <CloseAccount
            modalProps={{ isCurrent: true, parent: node }}
            account={accounts[0]}
            accounts={accounts}
            categoryGroups={categoryGroups}
            balance={12000}
            canDelete={false}
          />
        )}
      </TestModal>
    </Section>
  </Router>
);
