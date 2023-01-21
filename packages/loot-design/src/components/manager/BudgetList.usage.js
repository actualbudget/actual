import React from 'react';

import { Section, TestModal } from '../../guide/components';
import { colors } from '../../style';

import BudgetList from './BudgetList';

const files = [
  { name: 'Finances 2', id: '1', state: 'local' },
  { name: 'James', id: '2', state: 'detached' },
  { name: 'Sarah', id: '3', state: 'broken' },
  { name: 'Finances', id: '4', state: 'broken' },
  { name: 'Finances 2', id: '5', state: 'synced' },
  { name: 'Finances 2', id: '6', state: 'remote' },
  { name: 'Shift Reset LLC', id: '7' },
  { name: 'Shift Reset LLC', id: '8', state: 'unknown' }
];

export default () => (
  <Section>
    Budget List Modal
    <TestModal backgroundColor={colors.n10}>
      {node => (
        <BudgetList
          key="modal"
          modalProps={{ isCurrent: true, parent: node }}
          files={files}
          actions={{}}
        />
      )}
    </TestModal>
  </Section>
);
