import React from 'react';

import { render, fireEvent } from '@testing-library/react';
import { format as formatDate, parse as parseDate } from 'date-fns';
import { act } from 'react-dom/test-utils';

import {
  generateTransaction,
  generateAccount,
  generateCategoryGroups,
  TestProvider
} from 'loot-core/src/mocks';
import { initServer } from 'loot-core/src/platform/client/fetch';
import {
  addSplitTransaction,
  realizeTempTransactions,
  splitTransaction,
  updateTransaction
} from 'loot-core/src/shared';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { SelectedProviderWithItems } from 'loot-design/src/components';

import { SplitsExpandedProvider, TransactionTable } from './TransactionsTable';

const uuid = require('loot-core/src/platform/uuid');

const accounts = [generateAccount('Bank of America')];
const payees = [
  { id: 'payed-to', name: 'Payed To' },
  { id: 'guy', name: 'This guy on the side of the road' }
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
          sort_order: i
        },
        isSplit ? 30 : undefined,
        showError
      )
    );
  }

  return transactions;
}

class LiveTransactionTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = { transactions: props.transactions };
  }

  componentWillReceiveProps(nextProps) {
    if (this.state.transactions !== nextProps.transactions) {
      this.setState({ transactions: nextProps.transactions });
    }
  }

  notifyChange = () => {
    const { onTransactionsChange } = this.props;
    onTransactionsChange && onTransactionsChange(this.state.transactions);
  };

  onSplit = id => {
    let { state } = this;
    let { data, diff } = splitTransaction(state.transactions, id);
    this.setState({ transactions: data }, this.notifyChange);
    return diff.added[0].id;
  };

  // onDelete = id => {
  //   let { state } = this;
  //   this.setState(
  //     {
  //       transactions: applyChanges(
  //         deleteTransaction(state.transactions, id),
  //         state.transactions
  //       )
  //     },
  //     this.notifyChange
  //   );
  // };

  onSave = transaction => {
    let { state } = this;
    let { data } = updateTransaction(state.transactions, transaction);
    this.setState({ transactions: data }, this.notifyChange);
  };

  onAdd = newTransactions => {
    let { state } = this;
    newTransactions = realizeTempTransactions(newTransactions);
    this.setState(
      { transactions: [...newTransactions, ...state.transactions] },
      this.notifyChange
    );
  };

  onAddSplit = id => {
    let { state } = this;
    let { data, diff } = addSplitTransaction(state.transactions, id);
    this.setState({ transactions: data }, this.notifyChange);
    return diff.added[0].id;
  };

  onCreatePayee = name => 'id';

  render() {
    const { state } = this;

    // It's important that these functions are they same instances
    // across renders. Doing so tests that the transaction table
    // implementation properly uses the right latest state even if the
    // hook dependencies haven't changed
    return (
      <TestProvider>
        <SelectedProviderWithItems
          name="transactions"
          items={state.transactions}
          fetchAllIds={() => state.transactions.map(t => t.id)}
        >
          <SplitsExpandedProvider>
            <TransactionTable
              {...this.props}
              transactions={state.transactions}
              loadMoreTransactions={() => {}}
              payees={payees}
              addNotification={n => console.log(n)}
              onSave={this.onSave}
              onSplit={this.onSplit}
              onAdd={this.onAdd}
              onAddSplit={this.onAddSplit}
              onCreatePayee={this.onCreatePayee}
            />
          </SplitsExpandedProvider>
        </SelectedProviderWithItems>
      </TestProvider>
    );
  }
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
    }
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
  []
);

const keys = {
  ESC: {
    key: 'Esc',
    keyCode: 27,
    which: 27
  },
  ENTER: {
    key: 'Enter',
    keyCode: 13,
    which: 13
  },
  TAB: {
    key: 'Tab',
    keyCode: 9,
    which: 9
  },
  DOWN: {
    key: 'Down',
    keyCode: 40,
    which: 40
  },
  UP: {
    key: 'Up',
    keyCode: 38,
    which: 38
  },
  LEFT: {
    key: 'Left',
    keyCode: 37,
    which: 37
  },
  RIGHT: {
    key: 'Right',
    keyCode: 39,
    which: 39
  }
};

function prettyDate(date) {
  return formatDate(parseDate(date, 'yyyy-MM-dd', new Date()), 'MM/dd/yyyy');
}

function keyWithShift(key) {
  return { ...key, shiftKey: true };
}

function renderTransactions(extraProps) {
  let transactions = generateTransactions(5, [6]);
  // Hardcoding the first value makes it easier for tests to do
  // various this
  transactions[0].amount = -2777;

  let defaultProps = {
    transactions,
    payees: payees,
    accounts: accounts,
    categoryGroups: categoryGroups,
    currentAccountId: accounts[0].id,
    showAccount: true,
    showCategory: true,
    isAdding: false,
    onTransactionsChange: t => {
      transactions = t;
    }
  };

  let result = render(
    <LiveTransactionTable {...defaultProps} {...extraProps} />
  );
  return {
    ...result,
    getTransactions: () => transactions,
    updateProps: props =>
      render(
        <LiveTransactionTable {...defaultProps} {...extraProps} {...props} />,
        { container: result.container }
      )
  };
}

function queryNewField(container, name, subSelector = '', idx = 0) {
  const field = container.querySelectorAll(
    `[data-testid="new-transaction"] [data-testid="${name}"]`
  )[idx];
  if (subSelector !== '') {
    return field.querySelector(subSelector);
  }
  return field;
}

function queryField(container, name, subSelector = '', idx) {
  const field = container.querySelectorAll(
    `[data-testid="transaction-table"] [data-testid="${name}"]`
  )[idx];
  if (subSelector !== '') {
    return field.querySelector(subSelector);
  }
  return field;
}

function _editField(field, container) {
  // We only short-circuit this for inputs
  let input = field.querySelector(`input`);
  if (input) {
    expect(container.ownerDocument.activeElement).toBe(input);
    return input;
  }

  let element;
  let buttonQuery = 'button,div[data-testid=cell-button]';

  if (field.querySelector(buttonQuery)) {
    let btn = field.querySelector(buttonQuery);
    fireEvent.click(btn);
    element = field.querySelector(':focus');
    expect(element).toBeTruthy();
  } else {
    fireEvent.click(field.querySelector('div'));
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
        prettyDate(transaction.date)
      );
      expect(queryField(container, 'account', 'div', idx).textContent).toBe(
        accounts.find(acct => acct.id === transaction.account).name
      );
      expect(queryField(container, 'payee', 'div', idx).textContent).toBe(
        payees.find(p => p.id === transaction.payee).name
      );
      expect(queryField(container, 'notes', 'div', idx).textContent).toBe(
        transaction.notes
      );
      expect(queryField(container, 'category', 'div', idx).textContent).toBe(
        transaction.category
          ? categories.find(category => category.id === transaction.category)
              .name
          : 'Categorize'
      );
      if (transaction.amount <= 0) {
        expect(queryField(container, 'debit', 'div', idx).textContent).toBe(
          integerToCurrency(-transaction.amount)
        );
        expect(queryField(container, 'credit', 'div', idx).textContent).toBe(
          ''
        );
      } else {
        expect(queryField(container, 'debit', 'div', idx).textContent).toBe('');
        expect(queryField(container, 'credit', 'div', idx).textContent).toBe(
          integerToCurrency(transaction.amount)
        );
      }
    });
  });

  test('keybindings enter/tab/alt should move around', () => {
    const { container } = renderTransactions();

    // Enter/tab goes down/right
    let input = editField(container, 'notes', 2);
    fireEvent.keyDown(input, keys.ENTER);
    expectToBeEditingField(container, 'notes', 3);

    input = editField(container, 'payee', 2);
    fireEvent.keyDown(input, keys.TAB);
    expectToBeEditingField(container, 'notes', 2);

    // Shift+enter/tab goes up/left
    input = editField(container, 'notes', 2);
    fireEvent.keyDown(input, keyWithShift(keys.ENTER));
    expectToBeEditingField(container, 'notes', 1);

    input = editField(container, 'payee', 2);
    fireEvent.keyDown(input, keyWithShift(keys.TAB));
    expectToBeEditingField(container, 'account', 2);

    // Moving forward on the last cell moves to the next row
    input = editField(container, 'cleared', 2);
    fireEvent.keyDown(input, keys.TAB);
    expectToBeEditingField(container, 'select', 3);

    // Moving backward on the first cell moves to the previous row
    editField(container, 'date', 2);
    input = editField(container, 'select', 2);
    fireEvent.keyDown(input, keyWithShift(keys.TAB));
    expectToBeEditingField(container, 'cleared', 1);

    // Blurring should close the input
    input = editField(container, 'credit', 1);
    fireEvent.blur(input);
    expect(container.querySelector('input')).toBe(null);

    // When reaching the bottom it shouldn't error
    input = editField(container, 'notes', 4);
    fireEvent.keyDown(input, keys.ENTER);

    // When reaching the top it shouldn't error
    input = editField(container, 'notes', 0);
    fireEvent.keyDown(input, keyWithShift(keys.ENTER));
  });

  test('keybinding escape resets the value', () => {
    const { container } = renderTransactions();

    let input = editField(container, 'notes', 2);
    let oldValue = input.value;
    fireEvent.change(input, { target: { value: 'yo new value' } });
    expect(input.value).toEqual('yo new value');
    fireEvent.keyDown(input, keys.ESC);
    expect(input.value).toEqual(oldValue);

    input = editField(container, 'category', 2);
    oldValue = input.value;
    fireEvent.change(input, { target: { value: 'Gener' } });
    expect(input.value).toEqual('Gener');
    fireEvent.keyDown(input, keys.ESC);
    expect(input.value).toEqual(oldValue);
  });

  test('text fields save when moved away from', () => {
    const { container, getTransactions } = renderTransactions();

    function runWithMovementKeys(func) {
      // All of these keys move to a different field, and the value in
      // the previous input should be saved
      const ks = [
        keys.TAB,
        keys.ENTER,
        keyWithShift(keys.TAB),
        keyWithShift(keys.ENTER)
      ];

      ks.forEach((k, i) => func(k, i));
    }

    runWithMovementKeys((key, idx) => {
      let input = editField(container, 'notes', 2);
      let oldValue = input.value;
      fireEvent.change(input, {
        target: { value: 'a happy little note' + idx }
      });
      // It's not saved yet
      expect(getTransactions()[2].notes).toBe(oldValue);
      fireEvent.keyDown(input, keys.TAB);
      // Now it should be saved!
      expect(getTransactions()[2].notes).toBe('a happy little note' + idx);
      expect(queryField(container, 'notes', 'div', 2).textContent).toBe(
        'a happy little note' + idx
      );
    });

    let input = editField(container, 'notes', 2);
    let oldValue = input.value;
    fireEvent.change(input, { target: { value: 'another happy note' } });
    // It's not saved yet
    expect(getTransactions()[2].notes).toBe(oldValue);
    // Blur the input to make it stop editing
    fireEvent.blur(input);
    expect(getTransactions()[2].notes).toBe('another happy note');
  });

  test('dropdown automatically opens and can be filtered', () => {
    const { container } = renderTransactions();

    let input = editField(container, 'category', 2);
    let tooltip = container.querySelector('[data-testid="tooltip"]');
    expect(tooltip).toBeTruthy();
    expect(
      [...tooltip.querySelectorAll('[data-testid*="category-item"]')].length
    ).toBe(9);

    fireEvent.change(input, { target: { value: 'Gener' } });

    // Make sure the list is filtered, the right items exist, and the
    // first item is highlighted
    let items = tooltip.querySelectorAll('[data-testid*="category-item"]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('Usual Expenses');
    expect(items[1].textContent).toBe('General');
    expect(items[1].dataset['testid']).toBe('category-item-highlighted');

    // It should also allow filtering on group names
    fireEvent.change(input, { target: { value: 'Usual' } });

    items = tooltip.querySelectorAll('[data-testid*="category-item"]');
    expect(items.length).toBe(4);
    expect(items[0].textContent).toBe('Usual Expenses');
    expect(items[1].textContent).toBe('Food');
    expect(items[2].textContent).toBe('General');
    expect(items[3].textContent).toBe('Home');
    expect(items[1].dataset['testid']).toBe('category-item-highlighted');
  });

  test('dropdown selects an item with keyboard', async () => {
    const { container, getTransactions } = renderTransactions();

    let input = editField(container, 'category', 2);
    let tooltip = container.querySelector('[data-testid="tooltip"]');

    // No item should be highlighted
    let highlighted = tooltip.querySelector(
      '[data-testid="category-item-highlighted"]'
    );
    expect(highlighted).toBe(null);

    fireEvent.keyDown(input, keys.DOWN);
    fireEvent.keyDown(input, keys.DOWN);
    fireEvent.keyDown(input, keys.DOWN);
    fireEvent.keyDown(input, keys.DOWN);

    // The right item should be highlighted
    highlighted = tooltip.querySelector(
      '[data-testid="category-item-highlighted"]'
    );
    expect(highlighted).toBeTruthy();
    expect(highlighted.textContent).toBe('General');

    expect(getTransactions()[2].category).toBe(
      categories.find(category => category.name === 'Food').id
    );

    fireEvent.keyDown(input, keys.ENTER);
    await waitForAutocomplete();

    // The transactions data should be updated with the right category
    expect(getTransactions()[2].category).toBe(
      categories.find(category => category.name === 'General').id
    );

    // The category field should still be editing
    expectToBeEditingField(container, 'category', 2);
    // No dropdown should be open
    expect(container.querySelector('[data-testid="tooltip"]')).toBe(null);

    // Pressing enter should now move down
    fireEvent.keyDown(input, keys.ENTER);
    expectToBeEditingField(container, 'category', 3);
  });

  test('dropdown selects an item when clicking', async () => {
    const { container, getTransactions } = renderTransactions();

    editField(container, 'category', 2);

    let tooltip = container.querySelector('[data-testid="tooltip"]');

    // Make sure none of the items are highlighted
    let items = tooltip.querySelectorAll('[data-testid="category-item"]');
    let highlighted = tooltip.querySelector(
      '[data-testid="category-item-highlighted"]'
    );
    expect(highlighted).toBe(null);

    // Hover over an item
    fireEvent.mouseMove(items[2]);

    // Make sure the expected category is highlighted
    highlighted = tooltip.querySelector(
      '[data-testid="category-item-highlighted"]'
    );
    expect(highlighted).toBeTruthy();
    expect(highlighted.textContent).toBe('General');

    // Click the item and check the before/after values
    expect(getTransactions()[2].category).toBe(
      categories.find(c => c.name === 'Food').id
    );
    fireEvent.click(items[2]);
    await waitForAutocomplete();
    expect(getTransactions()[2].category).toBe(
      categories.find(c => c.name === 'General').id
    );

    // It should still be editing the category
    tooltip = container.querySelector('[data-testid="tooltip"]');
    expect(tooltip).toBe(null);
    expectToBeEditingField(container, 'category', 2);
  });

  test("dropdown hovers but doesn't change value", () => {
    const { container, getTransactions } = renderTransactions();

    let input = editField(container, 'category', 2);
    let oldCategory = getTransactions()[2].category;
    let tooltip = container.querySelector('[data-testid="tooltip"]');

    let items = tooltip.querySelectorAll('[data-testid="category-item"]');

    // Hover over a few of the items to highlight them
    fireEvent.mouseMove(items[2]);
    fireEvent.mouseMove(items[3]);

    // Make sure one of them is highlighted
    let highlighted = tooltip.querySelector(
      '[data-testid="category-item-highlighted"]'
    );
    expect(highlighted).toBeTruthy();

    // Navigate away from the field with the keyboard
    fireEvent.keyDown(input, keys.TAB);

    // Make sure the category didn't update, and that the highlighted
    // field was different than the transactions' category
    let currentCategory = getTransactions()[2].category;
    expect(currentCategory).toBe(oldCategory);
    expect(highlighted.textContent).not.toBe(
      categories.find(c => c.id === currentCategory).name
    );
  });

  test('dropdown invalid value resets correctly', async () => {
    const { container, getTransactions } = renderTransactions();

    // Invalid values should be rejected and nullified
    let input = editField(container, 'category', 2);
    fireEvent.change(input, { target: { value: 'aaabbbccc' } });

    // For this first test case, make sure the tooltip is gone. We
    // don't need to check this in all the other cases
    let tooltipItems = container.querySelectorAll(
      '[data-testid="category-item-group"]'
    );
    expect(tooltipItems.length).toBe(0);

    expect(getTransactions()[2].category).not.toBe(null);
    fireEvent.keyDown(input, keys.TAB);
    expect(getTransactions()[2].category).toBe(null);

    // Clear out the category value
    input = editField(container, 'category', 3);
    fireEvent.change(input, { target: { value: '' } });

    // The category should be null when the value is cleared
    expect(getTransactions()[3].category).not.toBe(null);
    fireEvent.keyDown(input, keys.TAB);
    expect(getTransactions()[3].category).toBe(null);

    // Clear out the payee value
    input = editField(container, 'payee', 3);
    await new Promise(resolve => setTimeout(resolve, 10));
    fireEvent.change(input, { target: { value: '' } });

    // The payee should be empty when the value is cleared
    expect(getTransactions()[3].payee).not.toBe('');
    fireEvent.keyDown(input, keys.TAB);
    expect(getTransactions()[3].payee).toBe(null);
  });

  test('dropdown escape resets the value ', () => {
    const { container } = renderTransactions();

    let input = editField(container, 'category', 2);
    let oldValue = input.value;
    fireEvent.change(input, { target: { value: 'aaabbbccc' } });
    fireEvent.keyDown(input, keys.ESC);
    expect(input.value).toBe(oldValue);

    // The tooltip be closed
    let tooltip = container.querySelector('[data-testid="tooltip"]');
    expect(tooltip).toBeNull();
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

    input = editNewField(container, 'notes');
    fireEvent.change(input, { target: { value: 'a transaction' } });
    fireEvent.keyDown(input, keys.ENTER);

    input = editNewField(container, 'debit');
    expect(input.value).toBe('0.00');
    fireEvent.change(input, { target: { value: '100' } });

    act(() => {
      fireEvent.keyDown(input, keys.ENTER);
    });
    expect(getTransactions().length).toBe(6);
    expect(getTransactions()[0].amount).toBe(-10000);
    expect(getTransactions()[0].notes).toBe('a transaction');

    // The date field should be re-focused to enter a new transaction
    expect(container.ownerDocument.activeElement).toBe(
      queryNewField(container, 'date', 'input')
    );
    expect(queryNewField(container, 'debit').textContent).toBe('0.00');
  });

  test('adding a new split transaction works', async () => {
    const { container, getTransactions, updateProps } = renderTransactions();
    updateProps({ isAdding: true });

    let input = editNewField(container, 'debit');
    fireEvent.change(input, { target: { value: '55.00' } });
    fireEvent.blur(input);

    editNewField(container, 'category');
    let splitButton = document.body.querySelector(
      '[data-testid="tooltip"] [data-testid="split-transaction-button"]'
    );
    fireEvent.click(splitButton);
    await waitForAutocomplete();
    await waitForAutocomplete();
    await waitForAutocomplete();

    fireEvent.click(
      container.querySelector('[data-testid="transaction-error"] button')
    );

    input = editNewField(container, 'debit', 1);
    fireEvent.change(input, { target: { value: '45.00' } });
    fireEvent.blur(input);
    expect(
      container.querySelector('[data-testid="transaction-error"]')
    ).toBeTruthy();

    input = editNewField(container, 'debit', 2);
    fireEvent.change(input, { target: { value: '10.00' } });
    fireEvent.blur(input);
    expect(container.querySelector('[data-testid="transaction-error"]')).toBe(
      null
    );

    let addButton = container.querySelector('[data-testid="add-button"]');

    expect(getTransactions().length).toBe(5);
    fireEvent.click(addButton);
    expect(getTransactions().length).toBe(8);
    expect(getTransactions()[0].is_parent).toBe(true);
    expect(getTransactions()[0].amount).toBe(-5500);
    expect(getTransactions()[1].is_child).toBe(true);
    expect(getTransactions()[1].amount).toBe(-4500);
    expect(getTransactions()[2].is_child).toBe(true);
    expect(getTransactions()[2].amount).toBe(-1000);
    expect(getTransactions().slice(0, 3)).toMatchSnapshot();
  });

  test('escape closes the new transaction rows', () => {
    const { container, updateProps } = renderTransactions({
      onCloseAddTransaction: () => {
        updateProps({ isAdding: false });
      }
    });
    updateProps({ isAdding: true });

    // While adding a transaction, pressing escape should close the
    // new transaction form
    let input = expectToBeEditingField(container, 'date', 0, true);
    fireEvent.keyDown(input, keys.TAB);
    input = expectToBeEditingField(container, 'account', 0, true);
    // The first escape closes the dropdown
    fireEvent.keyDown(input, keys.ESC);
    expect(
      container.querySelector('[data-testid="new-transaction"]')
    ).toBeTruthy();

    // TOOD: Fix this
    // Now it should close the new transaction form
    // fireEvent.keyDown(input, keys.ESC);
    // expect(
    //   container.querySelector('[data-testid="new-transaction"]')
    // ).toBeNull();

    // The cancel button should also close the new transaction form
    updateProps({ isAdding: true });
    let cancelButton = container.querySelectorAll(
      '[data-testid="new-transaction"] [data-testid="cancel-button"]'
    )[0];
    fireEvent.click(cancelButton);
    expect(container.querySelector('[data-testid="new-transaction"]')).toBe(
      null
    );
  });

  test('transaction can be selected', () => {
    const { container } = renderTransactions();

    editField(container, 'date', 2);
    const selectCell = queryField(
      container,
      'select',
      '[data-testid=cell-button]',
      2
    );

    fireEvent.click(selectCell);
    // The header is is selected as well as the single transaction
    expect(container.querySelectorAll('[data-testid=select] svg').length).toBe(
      2
    );
  });

  test('transaction can be split, updated, and deleted', async () => {
    const { container, getTransactions, updateProps } = renderTransactions();

    let transactions = [...getTransactions()];
    // Change the id to simulate a new transaction being added, and
    // work with that one. This makes sure that the transaction table
    // properly references new data.
    transactions[0] = { ...transactions[0], id: uuid.v4Sync() };
    updateProps({ transactions });

    function expectErrorToNotExist(transactions) {
      transactions.forEach((transaction, idx) => {
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

    let input = editField(container, 'category', 0);
    let tooltip = container.querySelector('[data-testid="tooltip"]');
    let splitButton = tooltip.querySelector(
      '[data-testid="split-transaction-button"]'
    );

    // Make it clear that we are expected a negative transaction
    expect(getTransactions()[0].amount).toBe(-2777);
    expectErrorToNotExist([getTransactions()[0]]);

    // Make sure splitting a transaction works
    expect(getTransactions().length).toBe(5);
    fireEvent.click(splitButton);
    await waitForAutocomplete();
    expect(getTransactions().length).toBe(6);
    expect(getTransactions()[0].is_parent).toBe(true);
    expect(getTransactions()[1].is_child).toBe(true);
    expect(getTransactions()[1].amount).toBe(0);
    expectErrorToExist(getTransactions().slice(0, 2));

    let toolbars = container.querySelectorAll(
      '[data-testid="transaction-error"]'
    );
    // Make sure the toolbar has appeared
    expect(toolbars.length).toBe(1);
    let toolbar = toolbars[0];

    // Enter an amount for the new split transaction and make sure the
    // toolbar updates
    input = editField(container, 'debit', 1);
    fireEvent.change(input, { target: { value: '10.00' } });
    fireEvent.keyDown(input, keys.TAB);
    expect(toolbar.innerHTML.includes('17.77')).toBeTruthy();

    // Add another split transaction and make sure everything is
    // updated properly
    fireEvent.click(toolbar.querySelector('button'));
    expect(getTransactions().length).toBe(7);
    expect(getTransactions()[2].amount).toBe(0);
    expectErrorToExist(getTransactions().slice(0, 3));

    // Change the amount to resolve the whole transaction. The toolbar
    // should disappear and no error should exist
    input = editField(container, 'debit', 2);
    fireEvent.change(input, { target: { value: '17.77' } });
    fireEvent.keyDown(input, keys.TAB);
    expect(
      container.querySelectorAll('[data-testid="transaction-error"]').length
    ).toBe(0);
    expectErrorToNotExist(getTransactions().slice(0, 3));

    // This snapshot makes sure the data is as we expect. It also
    // shows the sort order and makes sure that is correct
    expect(getTransactions().slice(0, 3)).toMatchSnapshot();

    // Make sure deleting a split transaction updates the state again,
    // and deleting all split transactions turns it into a normal
    // transaction
    //
    // Deleting is disabled, unfortunately we can't delete in tests
    // yet because it doesn't do any batch editing
    //
    // const deleteCell = queryField(container, 'delete', '', 2);
    // fireEvent.click(deleteCell);
    // expect(getTransactions().length).toBe(6);
    // toolbar = container.querySelector('[data-testid="transaction-error"]');
    // expect(toolbar).toBeTruthy();
    // expect(toolbar.innerHTML.includes('17.77')).toBeTruthy();

    // fireEvent.click(queryField(container, 'delete', '', 1));
    // expect(getTransactions()[0].isParent).toBe(false);
  });

  test('transaction with splits shows 0 in correct column', async () => {
    const { container, getTransactions } = renderTransactions();

    let input = editField(container, 'category', 0);
    let tooltip = container.querySelector('[data-testid="tooltip"]');
    let splitButton = tooltip.querySelector(
      '[data-testid="split-transaction-button"'
    );

    // The first transaction should always be a negative amount
    expect(getTransactions()[0].amount).toBe(-2777);

    // Add two new split transactions
    expect(getTransactions().length).toBe(5);
    fireEvent.click(splitButton);
    await waitForAutocomplete();
    fireEvent.click(
      container.querySelector('[data-testid="transaction-error"] button')
    );
    expect(getTransactions().length).toBe(7);

    // The debit field should show the zeros
    expect(queryField(container, 'debit', '', 1).textContent).toBe('0.00');
    expect(queryField(container, 'credit', '', 1).textContent).toBe('');
    expect(queryField(container, 'debit', '', 2).textContent).toBe('0.00');
    expect(queryField(container, 'credit', '', 2).textContent).toBe('');

    // Change it to a credit transaction
    input = editField(container, 'credit', 0);
    fireEvent.change(input, { target: { value: '55.00' } });
    fireEvent.keyDown(input, keys.TAB);

    // The zeros should now display in the credit column
    expect(queryField(container, 'debit', '', 1).textContent).toBe('');
    expect(queryField(container, 'credit', '', 1).textContent).toBe('0.00');
    expect(queryField(container, 'debit', '', 2).textContent).toBe('');
    expect(queryField(container, 'credit', '', 2).textContent).toBe('0.00');
  });
});
