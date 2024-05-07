import React, { useState, useEffect } from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format as formatDate, parse as parseDate } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { SpreadsheetProvider } from 'loot-core/src/client/SpreadsheetProvider';
import {
  generateTransaction,
  generateAccount,
  generateCategoryGroups,
} from 'loot-core/src/mocks';
import { TestProvider } from 'loot-core/src/mocks/redux';
import { initServer } from 'loot-core/src/platform/client/fetch';
import {
  addSplitTransaction,
  realizeTempTransactions,
  splitTransaction,
  updateTransaction,
} from 'loot-core/src/shared/transactions';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { SelectedProviderWithItems } from '../../hooks/useSelected';
import { SplitsExpandedProvider } from '../../hooks/useSplitsExpanded';
import { ResponsiveProvider } from '../../ResponsiveProvider';

import { TransactionTable } from './TransactionsTable';

vi.mock('loot-core/src/platform/client/fetch');
vi.mock('../../hooks/useFeatureFlag', () => vi.fn().mockReturnValue(false));

const accounts = [generateAccount('Bank of America')];
const payees = [
  { id: 'payed-to', name: 'Payed To' },
  { id: 'guy', name: 'This guy on the side of the road' },
];
const categoryGroups = generateCategoryGroups([
  {
    name: 'Investments and Savings',
    categories: [{ name: 'Savings' }],
  },
  {
    name: 'Usual Expenses',
    categories: [{ name: 'Food' }, { name: 'General' }, { name: 'Home' }],
  },
  {
    name: 'Projects',
    categories: [{ name: 'Big Projects' }, { name: 'Shed' }],
  },
]);
const usualGroup = categoryGroups[1];

function generateTransactions(count, splitAtIndexes = [], showError = false) {
  const transactions = [];

  for (let i = 0; i < count; i++) {
    const isSplit = splitAtIndexes.includes(i);

    transactions.push.apply(
      transactions,
      generateTransaction(
        {
          account: accounts[0].id,
          category:
            i === 0
              ? null
              : i === 1
                ? usualGroup.categories[1].id
                : usualGroup.categories[0].id,
          amount: isSplit ? 50 : undefined,
          sort_order: i,
        },
        isSplit ? 30 : undefined,
        showError,
      ),
    );
  }

  return transactions;
}

function LiveTransactionTable(props) {
  const [transactions, setTransactions] = useState(props.transactions);

  useEffect(() => {
    if (transactions === props.transactions) return;
    props.onTransactionsChange?.(transactions);
  }, [transactions]);

  const onSplit = id => {
    const { data, diff } = splitTransaction(transactions, id);
    setTransactions(data);
    return diff.added[0].id;
  };

  const onSave = transaction => {
    const { data } = updateTransaction(transactions, transaction);
    setTransactions(data);
  };

  const onAdd = newTransactions => {
    newTransactions = realizeTempTransactions(newTransactions);
    setTransactions(trans => [...newTransactions, ...trans]);
  };

  const onAddSplit = id => {
    const { data, diff } = addSplitTransaction(transactions, id);
    setTransactions(data);
    return diff.added[0].id;
  };

  const onCreatePayee = () => 'id';

  // It's important that these functions are they same instances
  // across renders. Doing so tests that the transaction table
  // implementation properly uses the right latest state even if the
  // hook dependencies haven't changed
  return (
    <TestProvider>
      <ResponsiveProvider>
        <SpreadsheetProvider>
          <SelectedProviderWithItems
            name="transactions"
            items={transactions}
            fetchAllIds={() => transactions.map(t => t.id)}
          >
            <SplitsExpandedProvider>
              <TransactionTable
                {...props}
                transactions={transactions}
                loadMoreTransactions={() => {}}
                payees={payees}
                addNotification={n => console.log(n)}
                onSave={onSave}
                onSplit={onSplit}
                onAdd={onAdd}
                onAddSplit={onAddSplit}
                onCreatePayee={onCreatePayee}
              />
            </SplitsExpandedProvider>
          </SelectedProviderWithItems>
        </SpreadsheetProvider>
      </ResponsiveProvider>
    </TestProvider>
  );
}

function initBasicServer() {
  initServer({
    query: async query => {
      switch (query.table) {
        case 'payees':
          return { data: payees, dependencies: [] };
        case 'accounts':
          return { data: accounts, dependencies: [] };
        default:
          throw new Error(`queried unknown table: ${query.table}`);
      }
    },
    getCell: () => ({
      value: 129_87,
    }),
    'get-categories': () => ({ grouped: categoryGroups, list: categories }),
  });
}

beforeEach(() => {
  initBasicServer();
});

afterEach(() => {
  global.__resetWorld();
});

// Not good, see `Autocomplete.js` for details
function waitForAutocomplete() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

const categories = categoryGroups.reduce(
  (all, group) => all.concat(group.categories),
  [],
);

function prettyDate(date) {
  return formatDate(parseDate(date, 'yyyy-MM-dd', new Date()), 'MM/dd/yyyy');
}

function renderTransactions(extraProps) {
  let transactions = generateTransactions(5, [6]);
  // Hardcoding the first value makes it easier for tests to do
  // various this
  transactions[0].amount = -2777;

  const defaultProps = {
    transactions,
    payees,
    accounts,
    categoryGroups,
    currentAccountId: accounts[0].id,
    showAccount: true,
    showCategory: true,
    showCleared: true,
    isAdding: false,
    onTransactionsChange: t => {
      transactions = t;
    },
  };

  const result = render(
    <LiveTransactionTable {...defaultProps} {...extraProps} />,
  );
  return {
    ...result,
    getTransactions: () => transactions,
    updateProps: props =>
      render(
        <LiveTransactionTable {...defaultProps} {...extraProps} {...props} />,
        { container: result.container },
      ),
  };
}

function queryNewField(container, name, subSelector = '', idx = 0) {
  const field = container.querySelectorAll(
    `[data-testid="new-transaction"] [data-testid="${name}"]`,
  )[idx];
  if (subSelector !== '') {
    return field.querySelector(subSelector);
  }
  return field;
}

function queryField(container, name, subSelector = '', idx) {
  const field = container.querySelectorAll(
    `[data-testid="transaction-table"] [data-testid="${name}"]`,
  )[idx];
  if (subSelector !== '') {
    return field.querySelector(subSelector);
  }
  return field;
}

async function _editField(field, container) {
  // We only short-circuit this for inputs
  const input = field.querySelector(`input`);
  if (input) {
    expect(container.ownerDocument.activeElement).toBe(input);
    return input;
  }

  let element;
  const buttonQuery = 'button,div[data-testid=cell-button]';

  if (field.querySelector(buttonQuery)) {
    const btn = field.querySelector(buttonQuery);
    await userEvent.click(btn);
    element = field.querySelector(':focus');
    expect(element).toBeTruthy();
  } else {
    await userEvent.click(field.querySelector('div'));
    element = field.querySelector('input');
    expect(element).toBeTruthy();
    expect(container.ownerDocument.activeElement).toBe(element);
  }

  return element;
}

function editNewField(container, name, rowIndex) {
  const field = queryNewField(container, name, '', rowIndex);
  return _editField(field, container);
}

function editField(container, name, rowIndex) {
  const field = queryField(container, name, '', rowIndex);
  return _editField(field, container);
}

function expectToBeEditingField(container, name, rowIndex, isNew) {
  let field;
  if (isNew) {
    field = queryNewField(container, name, '', rowIndex);
  } else {
    field = queryField(container, name, '', rowIndex);
  }
  const input = field.querySelector(':focus');
  expect(input).toBeTruthy();
  expect(container.ownerDocument.activeElement).toBe(input);
  return input;
}

describe('Transactions', () => {
  test('transactions table shows the correct data', () => {
    const { container, getTransactions } = renderTransactions();

    getTransactions().forEach((transaction, idx) => {
      expect(queryField(container, 'date', 'div', idx).textContent).toBe(
        prettyDate(transaction.date),
      );
      expect(queryField(container, 'account', 'div', idx).textContent).toBe(
        accounts.find(acct => acct.id === transaction.account).name,
      );
      expect(queryField(container, 'payee', 'div', idx).textContent).toBe(
        payees.find(p => p.id === transaction.payee).name,
      );
      expect(queryField(container, 'notes', 'div', idx).textContent).toBe(
        transaction.notes,
      );
      expect(queryField(container, 'category', 'div', idx).textContent).toBe(
        transaction.category
          ? categories.find(category => category.id === transaction.category)
              .name
          : 'Categorize',
      );
      if (transaction.amount <= 0) {
        expect(queryField(container, 'debit', 'div', idx).textContent).toBe(
          integerToCurrency(-transaction.amount),
        );
        expect(queryField(container, 'credit', 'div', idx).textContent).toBe(
          '',
        );
      } else {
        expect(queryField(container, 'debit', 'div', idx).textContent).toBe('');
        expect(queryField(container, 'credit', 'div', idx).textContent).toBe(
          integerToCurrency(transaction.amount),
        );
      }
    });
  });

  test('keybindings enter/tab/alt should move around', async () => {
    const { container } = renderTransactions();

    // Enter/tab goes down/right
    let input = await editField(container, 'notes', 2);
    await userEvent.type(input, '[Enter]');
    expectToBeEditingField(container, 'notes', 3);

    input = await editField(container, 'payee', 2);
    await userEvent.type(input, '[Tab]');
    expectToBeEditingField(container, 'notes', 2);

    // Shift+enter/tab goes up/left
    input = await editField(container, 'notes', 2);
    await userEvent.type(input, '{Shift>}[Enter]{/Shift}');
    expectToBeEditingField(container, 'notes', 1);

    input = await editField(container, 'payee', 2);
    await userEvent.type(input, '{Shift>}[Tab]{/Shift}');
    expectToBeEditingField(container, 'account', 2);

    // Moving forward on the last cell moves to the next row
    input = await editField(container, 'cleared', 2);
    await userEvent.type(input, '[Tab]');
    expectToBeEditingField(container, 'select', 3);

    // Moving backward on the first cell moves to the previous row
    await editField(container, 'date', 2);
    input = await editField(container, 'select', 2);
    await userEvent.type(input, '{Shift>}[Tab]{/Shift}');
    expectToBeEditingField(container, 'cleared', 1);

    // Blurring should close the input
    input = await editField(container, 'credit', 1);
    fireEvent.blur(input);
    expect(container.querySelector('input')).toBe(null);

    // When reaching the bottom it shouldn't error
    input = await editField(container, 'notes', 4);
    await userEvent.type(input, '[Enter]');

    // TODO: fix flakiness and re-enable
    // When reaching the top it shouldn't error
    // input = await editField(container, 'notes', 0);
    // await userEvent.type(input, '{Shift>}[Enter]{/Shift}');
  });

  test('keybinding escape resets the value', async () => {
    const { container } = renderTransactions();

    let input = await editField(container, 'notes', 2);
    let oldValue = input.value;
    await userEvent.clear(input);
    await userEvent.type(input, 'yo new value');
    expect(input.value).toEqual('yo new value');
    await userEvent.type(input, '[Escape]');
    expect(input.value).toEqual(oldValue);

    input = await editField(container, 'category', 2);
    oldValue = input.value;
    await userEvent.clear(input);
    await userEvent.type(input, 'Gener');
    expect(input.value).toEqual('Gener');
    await userEvent.type(input, '[Escape]');
    expect(input.value).toEqual(oldValue);
  });

  test('text fields save when moved away from', async () => {
    const { container, getTransactions } = renderTransactions();

    // All of these keys move to a different field, and the value in
    // the previous input should be saved
    const ks = [
      '[Tab]',
      '[Enter]',
      '{Shift>}[Tab]{/Shift}',
      '{Shift>}[Enter]{/Shift}',
    ];

    for (const idx in ks) {
      const input = await editField(container, 'notes', 2);
      const oldValue = input.value;
      await userEvent.clear(input);
      await userEvent.type(input, 'a happy little note' + idx);
      // It's not saved yet
      expect(getTransactions()[2].notes).toBe(oldValue);
      await userEvent.type(input, '[Tab]');
      // Now it should be saved!
      expect(getTransactions()[2].notes).toBe('a happy little note' + idx);
      expect(queryField(container, 'notes', 'div', 2).textContent).toBe(
        'a happy little note' + idx,
      );
    }

    const input = await editField(container, 'notes', 2);
    const oldValue = input.value;
    await userEvent.clear(input);
    await userEvent.type(input, 'another happy note');
    // It's not saved yet
    expect(getTransactions()[2].notes).toBe(oldValue);
    // Blur the input to make it stop editing
    await userEvent.tab();
    expect(getTransactions()[2].notes).toBe('another happy note');
  });

  test('dropdown automatically opens and can be filtered', async () => {
    const { container } = renderTransactions();

    const categories = categoryGroups.flatMap(group => group.categories);
    const input = await editField(container, 'category', 2);
    expect(
      [
        ...screen
          .getByTestId('autocomplete')
          .querySelectorAll('[data-testid*="category-item"]'),
      ].length,
    ).toBe(categoryGroups.length + categories.length);

    await userEvent.clear(input);
    await userEvent.type(input, 'Gener');

    // Make sure the list is filtered, the right items exist, and the
    // first item is highlighted
    let items = screen
      .getByTestId('autocomplete')
      .querySelectorAll('[data-testid*="category-item"]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('Usual Expenses');
    expect(items[1].textContent).toBe('General 129.87');
    expect(items[1].dataset['highlighted']).toBeDefined();

    // It should not allow filtering on group names
    await userEvent.clear(input);
    await userEvent.type(input, 'Usual Expenses');

    items = screen
      .getByTestId('autocomplete')
      .querySelectorAll('[data-testid$="category-item"]');
    expect(items.length).toBe(0);
  });

  test('dropdown selects an item with keyboard', async () => {
    const { container, getTransactions } = renderTransactions();

    const input = await editField(container, 'category', 2);

    // No item should be highlighted
    let highlighted = screen
      .getByTestId('autocomplete')
      .querySelector('[data-highlighted]');
    expect(highlighted).toBeNull();

    await userEvent.keyboard('[ArrowDown][ArrowDown][ArrowDown][ArrowDown]');

    // The right item should be highlighted
    highlighted = screen
      .getByTestId('autocomplete')
      .querySelector('[data-highlighted]');
    expect(highlighted).not.toBeNull();
    expect(highlighted.textContent).toBe('General 129.87');

    expect(getTransactions()[2].category).toBe(
      categories.find(category => category.name === 'Food').id,
    );

    await userEvent.type(input, '[Enter]');
    await waitForAutocomplete();

    // The transactions data should be updated with the right category
    expect(getTransactions()[2].category).toBe(
      categories.find(category => category.name === 'General').id,
    );

    // The category field should still be editing
    expectToBeEditingField(container, 'category', 2);
    // No dropdown should be open
    expect(container.querySelector('[data-testid="autocomplete"]')).toBe(null);

    // Pressing enter should now move down
    await userEvent.type(input, '[Enter]');
    expectToBeEditingField(container, 'category', 3);
  });

  test('dropdown selects an item when clicking', async () => {
    const { container, getTransactions } = renderTransactions();

    await editField(container, 'category', 2);

    // Make sure none of the items are highlighted
    const items = screen
      .getByTestId('autocomplete')
      .querySelectorAll('[data-testid$="category-item"]');
    let highlighted = screen
      .getByTestId('autocomplete')
      .querySelector('[data-highlighted]');
    expect(highlighted).toBeNull();

    // Hover over an item
    await userEvent.hover(items[2]);

    // Make sure the expected category is highlighted
    highlighted = screen
      .getByTestId('autocomplete')
      .querySelector('[data-highlighted]');
    expect(highlighted).not.toBeNull();
    expect(highlighted.textContent).toBe('General 129.87');

    // Click the item and check the before/after values
    expect(getTransactions()[2].category).toBe(
      categories.find(c => c.name === 'Food').id,
    );
    await userEvent.click(items[2]);
    await waitForAutocomplete();
    expect(getTransactions()[2].category).toBe(
      categories.find(c => c.name === 'General').id,
    );

    // It should still be editing the category
    expect(screen.queryByTestId('autocomplete')).toBe(null);
    expectToBeEditingField(container, 'category', 2);
  });

  test('dropdown hovers but doesn’t change value', async () => {
    const { container, getTransactions } = renderTransactions();

    const input = await editField(container, 'category', 2);
    const oldCategory = getTransactions()[2].category;

    const items = screen
      .getByTestId('autocomplete')
      .querySelectorAll('[data-testid$="category-item"]');

    // Hover over a few of the items to highlight them
    await userEvent.hover(items[2]);
    await userEvent.hover(items[3]);

    // Make sure one of them is highlighted
    const highlighted = screen
      .getByTestId('autocomplete')
      .querySelectorAll('[data-highlighted]');
    expect(highlighted).toHaveLength(1);

    // Navigate away from the field with the keyboard
    await userEvent.type(input, '[Tab]');

    // Make sure the category didn't update, and that the highlighted
    // field was different than the transactions' category
    const currentCategory = getTransactions()[2].category;
    expect(currentCategory).toBe(oldCategory);
    expect(highlighted.textContent).not.toBe(
      categories.find(c => c.id === currentCategory).name,
    );
  });

  // TODO: fix this test
  test.skip('dropdown invalid value resets correctly', async () => {
    const { container, getTransactions } = renderTransactions();

    // Invalid values should be rejected and nullified
    let input = await editField(container, 'category', 2);
    await userEvent.clear(input);
    await userEvent.type(input, 'aaabbbccc');

    // For this first test case, make sure the tooltip is gone. We
    // don't need to check this in all the other cases
    const tooltipItems = container.querySelectorAll(
      '[data-testid="category-item-group"]',
    );
    expect(tooltipItems.length).toBe(0);

    expect(getTransactions()[2].category).not.toBe(null);
    await userEvent.tab();
    expect(getTransactions()[2].category).toBe(null);

    // Clear out the category value
    input = await editField(container, 'category', 3);
    await userEvent.clear(input);

    // The category should be null when the value is cleared
    expect(getTransactions()[3].category).not.toBe(null);
    await userEvent.tab();
    expect(getTransactions()[3].category).toBe(null);

    // Clear out the payee value
    input = await editField(container, 'payee', 3);
    await new Promise(resolve => setTimeout(resolve, 10));
    await userEvent.clear(input);

    // The payee should be empty when the value is cleared
    expect(getTransactions()[3].payee).not.toBe('');
    await userEvent.tab();
    expect(getTransactions()[3].payee).toBe(null);
  });

  test('dropdown escape resets the value ', async () => {
    const { container } = renderTransactions();

    const input = await editField(container, 'category', 2);
    const oldValue = input.value;
    await userEvent.type(input, 'aaabbbccc[Escape]');
    expect(input.value).toBe(oldValue);

    // The tooltip be closed
    expect(screen.queryByTestId('autocomplete')).toBeNull();
  });

  test('adding a new transaction works', async () => {
    const { queryByTestId, container, getTransactions, updateProps } =
      renderTransactions();

    expect(getTransactions().length).toBe(5);
    expect(queryByTestId('new-transaction')).toBe(null);
    updateProps({ isAdding: true });
    expect(queryByTestId('new-transaction')).toBeTruthy();

    let input = queryNewField(container, 'date', 'input');

    // The date input should exist and have a default value
    expect(input).toBeTruthy();
    expect(container.ownerDocument.activeElement).toBe(input);
    expect(input.value).not.toBe('');

    input = await editNewField(container, 'notes');
    await userEvent.clear(input);
    await userEvent.type(input, 'a transaction');

    input = await editNewField(container, 'debit');
    expect(input.value).toBe('0.00');
    await userEvent.clear(input);
    await userEvent.type(input, '100[Enter]');

    expect(getTransactions().length).toBe(6);
    expect(getTransactions()[0].amount).toBe(-10000);
    expect(getTransactions()[0].notes).toBe('a transaction');

    // The date field should be re-focused to enter a new transaction
    expect(container.ownerDocument.activeElement).toBe(
      queryNewField(container, 'date', 'input'),
    );
    expect(queryNewField(container, 'debit').textContent).toBe('0.00');
  });

  test('adding a new split transaction works', async () => {
    const { container, getTransactions, updateProps } = renderTransactions();
    updateProps({ isAdding: true });

    let input = await editNewField(container, 'debit');
    await userEvent.clear(input);
    await userEvent.type(input, '55.00');

    await editNewField(container, 'category');
    await userEvent.click(screen.getByTestId('split-transaction-button'));
    await waitForAutocomplete();
    await waitForAutocomplete();
    await waitForAutocomplete();

    await userEvent.click(
      container.querySelector('[data-testid="add-split-button"]'),
    );

    input = await editNewField(container, 'debit', 1);
    await userEvent.clear(input);
    await userEvent.type(input, '45.00');
    expect(
      container.querySelector('[data-testid="transaction-error"]'),
    ).toBeTruthy();

    input = await editNewField(container, 'debit', 2);
    await userEvent.clear(input);
    await userEvent.type(input, '10.00');
    await userEvent.tab();
    expect(container.querySelector('[data-testid="transaction-error"]')).toBe(
      null,
    );

    const addButton = container.querySelector('[data-testid="add-button"]');

    expect(getTransactions().length).toBe(5);
    await userEvent.click(addButton);
    expect(getTransactions().length).toBe(8);
    expect(getTransactions()[0].is_parent).toBe(true);
    expect(getTransactions()[0].amount).toBe(-5500);
    expect(getTransactions()[1].is_child).toBe(true);
    expect(getTransactions()[1].amount).toBe(-4500);
    expect(getTransactions()[2].is_child).toBe(true);
    expect(getTransactions()[2].amount).toBe(-1000);
  });

  test('escape closes the new transaction rows', async () => {
    const { container, updateProps } = renderTransactions({
      onCloseAddTransaction: () => {
        updateProps({ isAdding: false });
      },
    });
    updateProps({ isAdding: true });

    // While adding a transaction, pressing escape should close the
    // new transaction form
    let input = expectToBeEditingField(container, 'date', 0, true);
    await userEvent.type(input, '[Tab]');
    input = expectToBeEditingField(container, 'account', 0, true);
    // The first escape closes the dropdown
    await userEvent.type(input, '[Escape]');
    expect(
      container.querySelector('[data-testid="new-transaction"]'),
    ).toBeTruthy();

    // TODO: Fix this
    // Now it should close the new transaction form
    // await userEvent.type(input, '[Escape]');
    // expect(
    //   container.querySelector('[data-testid="new-transaction"]')
    // ).toBeNull();

    // The cancel button should also close the new transaction form
    updateProps({ isAdding: true });
    const cancelButton = container.querySelectorAll(
      '[data-testid="new-transaction"] [data-testid="cancel-button"]',
    )[0];
    await userEvent.click(cancelButton);
    expect(container.querySelector('[data-testid="new-transaction"]')).toBe(
      null,
    );
  });

  test('transaction can be selected', async () => {
    const { container } = renderTransactions();

    await editField(container, 'date', 2);
    const selectCell = queryField(
      container,
      'select',
      '[data-testid=cell-button]',
      2,
    );

    await userEvent.click(selectCell);
    // The header is is selected as well as the single transaction
    expect(container.querySelectorAll('[data-testid=select] svg').length).toBe(
      2,
    );
  });

  test('transaction can be split, updated, and deleted', async () => {
    const { container, getTransactions, updateProps } = renderTransactions();

    const transactions = [...getTransactions()];
    // Change the id to simulate a new transaction being added, and
    // work with that one. This makes sure that the transaction table
    // properly references new data.
    transactions[0] = { ...transactions[0], id: uuidv4() };
    updateProps({ transactions });

    function expectErrorToNotExist(transactions) {
      transactions.forEach(transaction => {
        expect(transaction.error).toBeFalsy();
      });
    }

    function expectErrorToExist(transactions) {
      transactions.forEach((transaction, idx) => {
        if (idx === 0) {
          expect(transaction.error).toBeTruthy();
        } else {
          expect(transaction.error).toBeFalsy();
        }
      });
    }

    let input = await editField(container, 'category', 0);

    // Make it clear that we are expected a negative transaction
    expect(getTransactions()[0].amount).toBe(-2777);
    expectErrorToNotExist([getTransactions()[0]]);

    // Make sure splitting a transaction works
    expect(getTransactions().length).toBe(5);
    await userEvent.click(screen.getByTestId('split-transaction-button'));
    await waitForAutocomplete();

    expect(getTransactions().length).toBe(6);
    expect(getTransactions()[0].is_parent).toBe(true);
    expect(getTransactions()[1].is_child).toBe(true);
    expect(getTransactions()[1].amount).toBe(0);
    expectErrorToExist(getTransactions().slice(0, 2));

    const toolbars = container.querySelectorAll(
      '[data-testid="transaction-error"]',
    );
    // Make sure the toolbar has appeared
    expect(toolbars.length).toBe(1);
    const toolbar = toolbars[0];

    // Enter an amount for the new split transaction and make sure the
    // toolbar updates
    input = await editField(container, 'debit', 1);
    await userEvent.clear(input);
    await userEvent.type(input, '10.00[tab]');
    expect(toolbar.innerHTML.includes('17.77')).toBeTruthy();

    // Add another split transaction and make sure everything is
    // updated properly
    await userEvent.click(
      toolbar.querySelector('[data-testid="add-split-button"]'),
    );
    expect(getTransactions().length).toBe(7);
    expect(getTransactions()[2].amount).toBe(0);
    expectErrorToExist(getTransactions().slice(0, 3));

    // Change the amount to resolve the whole transaction. The toolbar
    // should disappear and no error should exist
    input = await editField(container, 'debit', 2);
    await userEvent.clear(input);
    await userEvent.type(input, '17.77[tab]');
    await userEvent.tab();
    expect(screen.queryAllByTestId('transaction-error')).toHaveLength(0);
    expectErrorToNotExist(getTransactions().slice(0, 3));

    // This snapshot makes sure the data is as we expect. It also
    // shows the sort order and makes sure that is correct
    const parentId = getTransactions()[0].id;
    expect(getTransactions().slice(0, 3)).toEqual([
      {
        account: accounts[0].id,
        amount: -2777,
        category: null,
        cleared: false,
        date: '2017-01-01',
        error: null,
        id: expect.any(String),
        is_parent: true,
        notes: 'Notes',
        payee: 'payed-to',
        sort_order: 0,
      },
      {
        account: accounts[0].id,
        amount: -1000,
        category: null,
        cleared: false,
        date: '2017-01-01',
        error: null,
        id: expect.any(String),
        is_child: true,
        parent_id: parentId,
        payee: 'payed-to',
        sort_order: -1,
        starting_balance_flag: null,
      },
      {
        account: accounts[0].id,
        amount: -1777,
        category: null,
        cleared: false,
        date: '2017-01-01',
        error: null,
        id: expect.any(String),
        is_child: true,
        parent_id: parentId,
        payee: 'payed-to',
        sort_order: -2,
        starting_balance_flag: null,
      },
    ]);

    // Make sure deleting a split transaction updates the state again,
    // and deleting all split transactions turns it into a normal
    // transaction
    //
    // Deleting is disabled, unfortunately we can't delete in tests
    // yet because it doesn't do any batch editing
    //
    // const deleteCell = queryField(container, 'delete', '', 2);
    // await userEvent.click(deleteCell);
    // expect(getTransactions().length).toBe(6);
    // toolbar = container.querySelector('[data-testid="transaction-error"]');
    // expect(toolbar).toBeTruthy();
    // expect(toolbar.innerHTML.includes('17.77')).toBeTruthy();

    // await userEvent.click(queryField(container, 'delete', '', 1));
    // expect(getTransactions()[0].isParent).toBe(false);
  });

  test('transaction with splits shows 0 in correct column', async () => {
    const { container, getTransactions } = renderTransactions();

    let input = await editField(container, 'category', 0);

    // The first transaction should always be a negative amount
    expect(getTransactions()[0].amount).toBe(-2777);

    // Add two new split transactions
    expect(getTransactions().length).toBe(5);
    await userEvent.click(screen.getByTestId('split-transaction-button'));
    await waitForAutocomplete();
    await userEvent.click(
      container.querySelector('[data-testid="add-split-button"]'),
    );
    expect(getTransactions().length).toBe(7);

    // The debit field should show the zeros
    expect(queryField(container, 'debit', '', 1).textContent).toBe('0.00');
    expect(queryField(container, 'credit', '', 1).textContent).toBe('');
    expect(queryField(container, 'debit', '', 2).textContent).toBe('0.00');
    expect(queryField(container, 'credit', '', 2).textContent).toBe('');

    // Change it to a credit transaction
    input = await editField(container, 'credit', 0);
    await userEvent.type(input, '55.00{Tab}');

    // The zeros should now display in the credit column
    expect(queryField(container, 'debit', '', 1).textContent).toBe('');
    expect(queryField(container, 'credit', '', 1).textContent).toBe('0.00');
    expect(queryField(container, 'debit', '', 2).textContent).toBe('');
    expect(queryField(container, 'credit', '', 2).textContent).toBe('0.00');
  });
});
