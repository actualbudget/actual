import React from 'react';

import { Section, TestModal } from '../../guide/components';

import ConfigureLinkedAccounts from './ConfigureLinkedAccounts';

export default () => (
  <Section>
    Link Account Modal
    <TestModal>
      {node => (
        <ConfigureLinkedAccounts
          modalProps={{
            isCurrent: true,
            parent: node
          }}
          accounts={[
            {
              id: '1',
              name: 'Bank of America',
              mask: '1111'
            },
            {
              id: '2',
              name: 'Wells Fargo',
              mask: '2222'
            },
            {
              id: '3',
              name: 'Wells Fargo',
              mask: '3333'
            },
            {
              id: '4',
              name: 'Wells Fargo',
              mask: '4444'
            },
            {
              id: '5',
              name: 'Wells Fargo',
              mask: '5555'
            },
            {
              id: '6',
              name: 'Wells Fargo',
              mask: '6666'
            },
            {
              id: '7',
              name: 'Wells Fargo',
              mask: '7777'
            }
          ]}
        />
      )}
    </TestModal>
  </Section>
);
