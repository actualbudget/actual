import React from 'react';
import { MemoryRouter as Router } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';

import lively from '@jlongster/lively';

import makeSpreadsheet from 'loot-core/src/mocks/spreadsheet';
import { generateAccount } from 'loot-core/src/mocks';

import SpreadsheetContext from './spreadsheet/SpreadsheetContext';
import { Section } from '../guide/components';
import { Sidebar } from './sidebar';

function withState(state, render) {
  const Component = lively(render, { getInitialState: () => state });
  return <Component />;
}

const accounts = [
  generateAccount('Bank of America', true),
  generateAccount('Wells Fargo', true),
  generateAccount('Ally'),
  { ...generateAccount('401k'), closed: 1 },
  { ...generateAccount('Old Savings'), closed: 1 }
];

function makeSidebar(selected) {
  return withState({ selected }, ({ state: { selected }, setState }) => {
    return (
      <Router initialEntries={[selected]} initialIndex={0}>
        <DndProvider backend={Backend}>
          <Sidebar
            budgetName="Personal"
            accounts={accounts}
            getBalanceQuery={account => ({ expr: 10000 })}
            getOnBudgetBalance={() => ({ expr: 30000 })}
            getOffBudgetBalance={() => ({ expr: 10000 })}
            showClosedAccounts={true}
            style={{ paddingBottom: 100 }}
          />
        </DndProvider>
      </Router>
    );
  });
}

export default () => (
  <SpreadsheetContext.Provider value={makeSpreadsheet()}>
    <Section direction="horizontal">
      Sidebar
      {makeSidebar('/budget')}
      Sidebar Sidebar with Accounts Selected
      {makeSidebar('/accounts')}
      Sidebar Sidebar with One Account Selected
      {makeSidebar('/accounts/' + accounts[1].id)}
    </Section>
  </SpreadsheetContext.Provider>
);
