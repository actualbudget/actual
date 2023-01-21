import React from 'react';

import Component from '@reactions/component';

import { TestProvider } from 'loot-core/src/mocks/redux';
import { applyChanges } from 'loot-core/src/shared/util';

import { Section, TestModal } from '../guide/components';

import { ManagePayees } from './payees';

let categoryGroups = [
  {
    id: 'foo',
    name: 'Investments and Savings',
    is_income: 0,
    sort_order: 1,
    categories: [{ id: 'savings', name: 'Savings' }]
  },
  {
    id: 'usual',
    name: 'Usual Expenses',
    is_income: 0,
    sort_order: 2,
    categories: [
      { id: 'food', name: 'Food' },
      { id: 'general', name: 'General' },
      { id: 'home', name: 'Home' }
    ]
  },
  {
    id: 'projects',
    name: 'Projects',
    categories: [
      { id: 'big', name: 'Big Projects' },
      { id: 'shed', name: 'Shed' }
    ]
  }
];

let payees = [
  { id: 'one', name: 'Kroger', ruleCount: 1 },
  {
    id: 'two',
    name: 'Lowes',
    category: categoryGroups[1].categories[1].id,
    ruleCount: 1
  },
  { id: 'three', name: 'Publix', ruleCount: 1 },
  { id: 'four', name: 'Verizon', ruleCount: 3 },
  { id: 'eight', name: 'Aldi', ruleCount: 3 },
  { id: 'nine', name: 'T-Mobile', ruleCount: 2 },
  { id: 'ten', name: 'Google', ruleCount: 1 },
  { id: 'el', name: 'Sentry', ruleCount: 1 },
  { id: 'tw', name: 'Aldi', ruleCount: 2 },
  { id: 'th', name: 'T-Mobile', ruleCount: 3 },
  { id: 'fou', name: 'Google', ruleCount: 1 },
  { id: 'fifff', name: 'Sentry', ruleCount: 2 },
  { id: 'sixxx', name: 'Aldi', ruleCount: 1 },
  { id: 'nine1', name: 'T-Mobile', ruleCount: 2 },
  { id: 'ten1', name: 'Google', ruleCount: 1 },
  { id: 'el1', name: 'Sentry', ruleCount: 1 },
  { id: 'tw1', name: 'Aldi', ruleCount: 2 },
  { id: 'th1', name: 'T-Mobile', ruleCount: 3 },
  { id: 'fou1', name: 'Google', ruleCount: 1 },
  { id: 'fifff1', name: 'Sentry', ruleCount: 2 },
  { id: 'sixxx1', name: 'Aldi', ruleCount: 1 },
  { id: 'five', name: 'T-Mobile', transfer_acct: 'one', ruleCount: 5 },
  { id: 'six', name: 'Google', transfer_acct: 'one', ruleCount: 1 },
  { id: 'seven', name: 'Sentry', transfer_acct: 'one', ruleCount: 1 }
];

for (let i = 0; i < 4; i++) {
  payees = payees.concat(payees.map(p => ({ ...p, id: p.id + i })));
}

let defaultRules = [
  { id: '1', type: 'equals', value: 'target' },
  { id: '2', type: 'contains', value: 'targ#' }
];

export default () => (
  <Section>
    Manage Payees
    <TestProvider>
      <TestModal width={1000} height={700}>
        {node => (
          <Component
            initialState={{ payees, rules: [...defaultRules], isCurrent: true }}
          >
            {({ state, setState }) => {
              let onViewRules = () => setState({ isCurrent: false });

              return (
                <ManagePayees
                  modalProps={{
                    isCurrent: state.isCurrent,
                    parent: node,
                    onClose: () => setState({ isCurrent: true })
                  }}
                  payees={state.payees}
                  ruleCounts={
                    new Map([
                      ['three', 1],
                      ['tw', 3]
                    ])
                  }
                  categoryGroups={categoryGroups}
                  onBatchChange={changes => {
                    setState({ payees: applyChanges(changes, state.payees) });
                  }}
                  onViewRules={onViewRules}
                  initialSelectedIds={new Set([])}
                  ruleActions={{
                    loadRules: () =>
                      new Promise(resolve => resolve(state.rules)),
                    deleteRule: id => {},
                    saveRule: rule => {},
                    addRule: rule => {
                      return { ...rule, id: Math.random().toString() };
                    },
                    listenForUndo: () => {}
                  }}
                />
              );
            }}
          </Component>
        )}
      </TestModal>
    </TestProvider>
  </Section>
);
