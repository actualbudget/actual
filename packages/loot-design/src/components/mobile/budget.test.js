import React from 'react';

import { render, fireEvent } from '@testing-library/react';

import makeSpreadsheet from 'loot-core/src/mocks/spreadsheet';
import * as monthUtils from 'loot-core/src/shared/months';

import { MobileScreen } from '../../guide/components';
import SpreadsheetContext from '../spreadsheet/SpreadsheetContext';
import { BudgetTable, BudgetAccessoryView } from './budget';
import { categories, categoryGroups } from './budget.usage';
import InputAccessoryView from './InputAccessoryView';

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
      value('total-budgeted', -400),
      value('to-budget', 2000),

      value('from-last-month'),
      value('total-income'),
      value('total-spent', 25),
      value('total-leftover', 150)
    ];

    for (let group of categoryGroups) {
      if (group.is_income) {
        values.push(value('total-income', 2000));

        for (let cat of group.categories) {
          values.push(value(`sum-amount-${cat.id}`, 200));
        }
      } else {
        values = values.concat([
          value(`group-budget-${group.id}`, -25),
          value(`group-sum-amount-${group.id}`, 2500),
          value(`group-leftover-${group.id}`, 2500)
        ]);

        for (let cat of group.categories) {
          values = values.concat([
            value(`budget-${cat.id}`, 2500),
            value(`sum-amount-${cat.id}`, 0),
            value(`leftover-${cat.id}`, 1000),
            value(`carryover-${cat.id}`, false)
          ]);
        }
      }
    }
  }

  return spreadsheet;
}

class PrintError extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.log('[React error]', errorInfo.componentStack);
    throw error;
  }

  render() {
    return this.props.children;
  }
}

function renderBudget() {
  let sheet = makeLoadedSpreadsheet();
  return render(
    <SpreadsheetContext.Provider value={sheet}>
      <MobileScreen>
        <PrintError>
          <BudgetTable
            month="2017-01"
            monthBounds={{ start: '2016-10', end: '2017-06' }}
            categoryGroups={categoryGroups}
            categories={categories}
            summaryHeaderHeight={0}
            navigation={{ addListener: () => () => {} }}
            onBudgetAction={(month, type, args) => {
              if (type === 'budget-amount') {
                sheet.set(
                  monthUtils.sheetForMonth(month),
                  `budget-${args.category}`,
                  args.amount
                );
              }
            }}
          />

          <InputAccessoryView>
            <BudgetAccessoryView />
          </InputAccessoryView>
        </PrintError>
      </MobileScreen>
    </SpreadsheetContext.Provider>
  );
}

function getRow(container, index) {
  const field = container.querySelectorAll(
    `[data-testid="budget-table"] [data-testid="row"]`
  )[index];
  return field;
}

function getField(container, index, name) {
  return getRow(container, index).querySelector(`[data-testid="${name}"]`);
}

function getInput(container, index) {
  return getRow(container, index).querySelector('[data-testid="amount-input"]');
}

function getFakeInput(container, index) {
  return getRow(container, index).querySelector(
    '[data-testid="amount-fake-input"]'
  );
}

function getButton(container, name) {
  return container.querySelector('[data-testid="' + name + '"]');
}

function editRow(container, index) {
  fireEvent.press(getRow(container, index));
  expectToBeEditingRow(container, index);
}

function expectToNotBeEditing(container) {
  expect(container.ownerDocument.activeElement.tagName).not.toBe('input');
}

function expectToBeEditingRow(container, index) {
  const input = container.querySelectorAll('[data-testid="amount-input"]')[
    index
  ];
  expect(container.ownerDocument.activeElement).toBe(input);
}

describe('Budget', () => {
  test('up and down buttons move around categories', () => {
    const { container } = renderBudget();
    expectToNotBeEditing(container);

    editRow(container, 1);
    expectToBeEditingRow(container, 1);
    fireEvent.press(getButton(container, 'up'));
    expectToBeEditingRow(container, 0);

    // It should never go past the first item
    fireEvent.press(getButton(container, 'up'));
    expectToBeEditingRow(container, 0);

    // Move around some
    fireEvent.press(getButton(container, 'down'));
    expectToBeEditingRow(container, 1);
    fireEvent.press(getButton(container, 'down'));
    expectToBeEditingRow(container, 2);
    fireEvent.press(getButton(container, 'up'));
    expectToBeEditingRow(container, 1);

    // It should never go past the last expense category
    let lastCat = categories.findIndex(c => c.is_income) - 1;
    editRow(container, lastCat);
    expectToBeEditingRow(container, lastCat);
    fireEvent.press(getButton(container, 'down'));
    expectToBeEditingRow(container, lastCat);
  });

  test('budget cells can be edited', () => {
    const { container } = renderBudget();

    expect(getField(container, 1, 'budgeted').textContent).toBe('25.00');
    editRow(container, 1);

    let input = getInput(container, 1);
    fireEvent.change(input, { target: { value: '49' } });
    expect(getFakeInput(container, 1).textContent).toBe('49');

    fireEvent.press(getButton(container, 'done'));
    expectToNotBeEditing(container);

    expect(getField(container, 1, 'budgeted').textContent).toBe('49.00');
  });

  test('math operations work', async () => {
    const { container } = renderBudget();
    editRow(container, 1);

    // Only the math button should be shown
    expect(getButton(container, 'math')).toBeTruthy();
    expect(getButton(container, 'add')).not.toBeTruthy();
    expect(getButton(container, 'subtract')).not.toBeTruthy();
    expect(getButton(container, 'equal')).not.toBeTruthy();

    fireEvent.press(getButton(container, 'math'));

    // The math button should be gone and other buttons should exist
    expect(getButton(container, 'math')).not.toBeTruthy();
    expect(getButton(container, 'add')).toBeTruthy();
    expect(getButton(container, 'subtract')).toBeTruthy();
    expect(getButton(container, 'equal')).toBeTruthy();

    expect(getFakeInput(container, 1).textContent).toBe('25.00');

    // Adding should work
    fireEvent.press(getButton(container, 'add'));
    let input = getInput(container, 1);
    fireEvent.change(input, { target: { value: '1' } });
    expect(getFakeInput(container, 1).textContent).toBe('+1');

    // Pressing equal should update the value
    fireEvent.press(getButton(container, 'equal'));
    expect(getFakeInput(container, 1).textContent).toBe('26.00');
    expectToBeEditingRow(container, 1);

    // Subtracting should work
    fireEvent.press(getButton(container, 'subtract'));
    input = getInput(container, 1);
    fireEvent.change(input, { target: { value: '5' } });
    expect(getFakeInput(container, 1).textContent).toBe('-5');
    fireEvent.press(getButton(container, 'equal'));
    expect(getFakeInput(container, 1).textContent).toBe('21.00');

    // Pressing done should also update the value
    fireEvent.press(getButton(container, 'add'));
    input = getInput(container, 1);
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.press(getButton(container, 'done'));
    expectToNotBeEditing(container);

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(getField(container, 1, 'budgeted').textContent).toBe('22.00');
  });
});
