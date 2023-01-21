import React from 'react';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';

import { generateCategoryGroups } from 'loot-core/src/mocks';
import makeSpreadsheet from 'loot-core/src/mocks/spreadsheet';
import * as monthUtils from 'loot-core/src/shared/months';

import { Section } from '../../guide/components';
import { colors } from '../../style';
import { View } from '../common';
import SpreadsheetContext from '../spreadsheet/SpreadsheetContext';

import { BudgetMonthCountContext } from './BudgetMonthCountContext';
import DynamicBudgetTable from './DynamicBudgetTable';
import * as rollover from './rollover/rollover-components';
import { RolloverContext } from './rollover/RolloverContext';

const categoryGroups = generateCategoryGroups([
  {
    name: 'Investments and Savings',
    categories: [
      { name: 'food' },
      { name: 'beer' },
      { name: 'home' },
      { name: 'general' },
      { name: 'bills' }
    ]
  },
  {
    name: 'other stuff',
    categories: [
      { name: 'big projects' },
      { name: 'beer' },
      { name: 'home' },
      { name: 'general' },
      { name: 'bills' },
      { name: 'beer' },
      { name: 'home' }
    ]
  },
  {
    name: 'yet more stuff',
    categories: [{ name: 'general' }, { name: 'bills' }]
  },
  {
    name: 'Income',
    is_income: true,
    categories: [
      { name: 'income', is_income: true },
      { name: 'salary', is_income: true }
    ]
  }
]);

function makeLoadedSpreadsheet() {
  let spreadsheet = makeSpreadsheet();
  let months = monthUtils.rangeInclusive(
    monthUtils.subMonths('2017-01', 3),
    '2017-10'
  );

  // Something random
  let currentNumber = 2400;

  for (let month of months) {
    // eslint-disable-next-line
    function value(name, v) {
      spreadsheet.set(
        monthUtils.sheetForMonth(month),
        name,
        v || currentNumber++
      );
    }

    let values = [
      value('available-funds'),
      value('last-month-overspent'),
      value('buffered'),
      value('total-budgeted'),
      value('to-budget'),

      value('from-last-month'),
      value('total-income'),
      value('total-spent'),
      value('total-leftover')
    ];

    for (let group of categoryGroups) {
      if (group.is_income) {
        values.push(value('total-income'));

        for (let cat of group.categories) {
          values.push(value(`sum-amount-${cat.id}`));
        }
      } else {
        values = values.concat([
          value(`group-budget-${group.id}`),
          value(`group-sum-amount-${group.id}`),
          value(`group-leftover-${group.id}`)
        ]);

        for (let cat of group.categories) {
          let carryover = Math.random() < 0.2 ? true : false;
          values = values.concat([
            value(`budget-${cat.id}`),
            value(`sum-amount-${cat.id}`),
            value(`leftover-${cat.id}`, carryover ? -currentNumber : null),
            value(`carryover-${cat.id}`, carryover)
          ]);
        }
      }
    }
  }

  return spreadsheet;
}

export class LiveBudgetPage extends React.Component {
  state = {
    startMonth: '2017-01',
    categoryGroups,
    collapsed: [],
    newCategoryForGroup: false
  };

  render() {
    let { maxMonths } = this.props;
    let { startMonth, categoryGroups, collapsed, newCategoryForGroup } =
      this.state;

    let rolloverComponents = {
      SummaryComponent: rollover.BudgetSummary,
      ExpenseCategoryComponent: rollover.ExpenseCategoryMonth,
      ExpenseGroupComponent: rollover.ExpenseGroupMonth,
      IncomeCategoryComponent: rollover.IncomeCategoryMonth,
      IncomeGroupComponent: rollover.IncomeGroupMonth,
      BudgetTotalsComponent: rollover.BudgetTotalsMonth,
      IncomeHeaderComponent: rollover.IncomeHeaderMonth
    };

    return (
      <DndProvider backend={Backend}>
        <RolloverContext
          categoryGroups={categoryGroups}
          summaryCollapsed={false}
        >
          <View
            style={{
              height: 800,
              backgroundColor: colors.n10,
              overflow: 'hidden'
            }}
          >
            <DynamicBudgetTable
              prewarmStartMonth={startMonth}
              startMonth={startMonth}
              monthBounds={{
                start: monthUtils.subMonths('2017-01', 3),
                end: '2017-10'
              }}
              maxMonths={maxMonths}
              onMonthSelect={month => {
                this.setState({ startMonth: month });
              }}
              categoryGroups={categoryGroups}
              collapsed={collapsed}
              setCollapsed={collapsed => {
                this.setState({ collapsed });
              }}
              newCategoryForGroup={newCategoryForGroup}
              dataComponents={rolloverComponents}
              // onAddCategory={groupId => {}}
              onSavePrefs={() => {}}
              onShowNewCategory={groupId => {
                this.setState({
                  newCategoryForGroup: groupId,
                  collapsed: collapsed.filter(c => c !== groupId)
                });
              }}
              onHideNewCategory={() => {
                this.setState({ newCategoryForGroup: null });
              }}
              onSaveCategory={cat => {
                if (cat.id === 'new') {
                  cat.id = Math.random().toString();

                  this.setState({
                    categoryGroups: categoryGroups.map(group => {
                      if (group.id === cat.cat_group) {
                        return {
                          ...group,
                          categories: group.categories.concat([cat])
                        };
                      }
                      return group;
                    }),
                    newCategoryForGroup: null
                  });
                } else {
                  this.setState({
                    categoryGroups: categoryGroups.map(group => {
                      if (group.id === cat.cat_group) {
                        return {
                          ...group,
                          categories: group.categories.map(c =>
                            c.id === cat.id ? cat : c
                          )
                        };
                      }
                      return group;
                    })
                  });
                }
              }}
              onSaveGroup={group => {
                this.setState({
                  categoryGroups: categoryGroups.map(g =>
                    g.id === group.id ? group : g
                  )
                });
              }}
              onDeleteCategory={id => {
                this.setState({
                  categoryGroups: categoryGroups.map(group => {
                    return {
                      ...group,
                      categories: group.categories.filter(c => c.id !== id)
                    };
                  })
                });
              }}
              onDeleteGroup={id =>
                this.setState({
                  categoryGroups: categoryGroups.filter(g => g.id !== id)
                })
              }
              onReorderCategory={sortInfo => {}}
              onReorderGroup={sortInfo => {}}
            />
          </View>
        </RolloverContext>
      </DndProvider>
    );
  }
}

export default () => (
  <BudgetMonthCountContext.Provider value={{ setDisplayMax: () => {} }}>
    <SpreadsheetContext.Provider value={makeLoadedSpreadsheet()}>
      <Section>
        Budget Table
        <LiveBudgetPage maxMonths={3} />
      </Section>
      {/*<Section>
      Budget Table (2 months)
      <LiveBudgetPage width={1000} maxMonths={2} />
    </Section>*/}
    </SpreadsheetContext.Provider>
  </BudgetMonthCountContext.Provider>
);
