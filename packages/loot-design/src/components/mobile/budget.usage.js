import React from 'react';
import { View } from 'react-native';
import { MobileSection } from '../../guide/components';
import { BudgetTable, BudgetAccessoryView } from './budget';
import InputAccessoryView from './InputAccessoryView';
import { generateCategoryGroups } from 'loot-core/src/mocks';
import SpreadsheetContext from '../spreadsheet/SpreadsheetContext';
import makeSpreadsheet from 'loot-core/src/mocks/spreadsheet';

export const categoryGroups = generateCategoryGroups([
  {
    name: 'Investments and Savings',
    categories: [{ name: 'Savings' }]
  },
  {
    name: 'Usual Expenses',
    categories: [
      { name: 'Food' },
      { name: 'General' },
      { name: 'Home' },
      { name: 'Bills' },
      { name: 'Other Bills' },
      { name: 'Games' },
      { name: 'Hobby' },
      { name: 'Project' },
      { name: 'Garden' },
      { name: 'Desk' },
      { name: 'Beer' },
      { name: 'Movies' }
    ]
  },
  {
    name: 'Projects',
    categories: [{ name: 'Big Projects' }, { name: 'Shed' }]
  },
  {
    name: 'Income',
    is_income: true,
    categories: [
      { name: 'Salary', is_income: true },
      { name: 'Misc', is_income: true }
    ]
  }
]);
export const categories = categoryGroups.reduce(
  (acc, group) => acc.concat(group.categories),
  []
);

const budgetData = {
  toBudget: { value: 2000 },
  totalBudgeted: { value: -400 },
  totalSpent: { value: 25 },
  totalBalance: { value: 150 },

  categoryGroups: categoryGroups.map(group => {
    if (group.is_income) {
      return {
        ...group,
        received: { value: 2000 },
        categories: group.categories.map(cat => ({
          ...cat,
          received: { value: 200 }
        }))
      };
    }

    return {
      ...group,
      budgeted: { value: -25 },
      spent: { value: 2500 },
      balance: { value: 2500 },

      categories: group.categories.map(cat => ({
        ...cat,
        budgeted: { name: `budget-${cat.id}`, value: 2500 },
        spent: { value: 0 },
        balance: { value: 1000 }
      }))
    };
  })
};

export default () => (
  <SpreadsheetContext.Provider value={makeSpreadsheet()}>
    <MobileSection>
      Budget Table
      <View style={{ flex: 1 }}>
        <BudgetTable
          month="2018-01-01"
          monthBounds={{ start: '2016-10', end: '2017-06' }}
          categories={categories}
          categoryGroups={categoryGroups}
          budgetData={budgetData}
          summaryHeaderHeight={100}
        />

        <InputAccessoryView>
          <BudgetAccessoryView />
        </InputAccessoryView>
      </View>
    </MobileSection>
  </SpreadsheetContext.Provider>
);
