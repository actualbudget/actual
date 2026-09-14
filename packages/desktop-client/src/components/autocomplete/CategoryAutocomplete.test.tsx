import { useState } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { SpreadsheetProvider } from '#hooks/useSpreadsheet';
import { createTestQueryClient, TestProviders } from '#mocks';

import { CategoryAutocomplete } from './CategoryAutocomplete';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const categoryGroups: CategoryGroupEntity[] = [
  {
    id: 'group-food',
    name: 'Food',
    is_income: false,
    hidden: false,
    categories: [
      {
        id: 'cat-groceries',
        name: 'Groceries',
        group: 'group-food',
        is_income: false,
        hidden: false,
      },
    ],
  },
  {
    id: 'group-income',
    name: 'Income',
    is_income: true,
    hidden: false,
    categories: [],
  },
];

// See PayeeAutocomplete.test.tsx — Autocomplete defers some state updates.
function waitForAutocomplete() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('CategoryAutocomplete create option', () => {
  const queryClient = createTestQueryClient();
  // The real `useCreateCategoryMutation` runs, so creation is asserted through
  // the request it sends rather than through a mocked hook.
  const categoryCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    categoryCreate.mockResolvedValue('new-category-id');
    // CategoryItem reads balances through the spreadsheet even when they are
    // hidden, so the provider needs a backing server.
    initServer({
      query: async () => ({ data: [], dependencies: [] }),
      'get-cell': async () => ({ name: 'test-cell', value: 0 }),
      'category-create': categoryCreate,
    });
  });

  // Spies must be undone even when a test fails mid-way, or a suppressed
  // console.error leaks into the tests that follow. Neither the Vitest config
  // nor setupTests restores mocks, so do it here.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Mirrors the transactions cell: the parent owns the selected id and feeds it
  // back in, which is what the field displays.
  function ControlledCategoryAutocomplete({
    onSelect,
    ...props
  }: {
    onSelect: (id: string | null, value: string) => void;
    showCreateOption?: boolean;
  }) {
    const [value, setValue] = useState<string | null>(null);

    return (
      <CategoryAutocomplete
        categoryGroups={categoryGroups}
        value={value}
        type="single"
        embedded={false}
        // Mirrors TransactionsTable: the cell keeps the input focused,
        // which is what reopens the dropdown after switching steps.
        focused
        showBalances={false}
        onSelect={(id, selectedValue) => {
          setValue(id);
          onSelect(id, selectedValue);
        }}
        {...props}
      />
    );
  }

  function renderAutocomplete(props?: { showCreateOption?: boolean }) {
    const onSelect = vi.fn();

    render(
      <TestProviders queryClient={queryClient}>
        <SpreadsheetProvider>
          <div data-testid="autocomplete-test">
            <ControlledCategoryAutocomplete onSelect={onSelect} {...props} />
          </div>
        </SpreadsheetProvider>
      </TestProviders>,
    );

    return { onSelect, container: screen.getByTestId('autocomplete-test') };
  }

  async function type(container: HTMLElement, text: string) {
    const input = container.querySelector('input')!;
    await userEvent.click(input);
    await userEvent.type(input, text);
    await waitForAutocomplete();
  }

  it('does not offer to create anything when the option is off', async () => {
    const { container } = renderAutocomplete();
    await type(container, 'Takeaway');

    expect(
      screen.queryByTestId('create-category-button'),
    ).not.toBeInTheDocument();
  });

  it('offers to create the typed name when nothing matches', async () => {
    const { container } = renderAutocomplete({ showCreateOption: true });
    await type(container, 'Takeaway');

    expect(screen.getByTestId('create-category-button')).toHaveTextContent(
      'Create category "Takeaway"',
    );
  });

  it('does not offer to create a category that already exists', async () => {
    const { container } = renderAutocomplete({ showCreateOption: true });
    await type(container, 'Groceries');

    expect(
      screen.queryByTestId('create-category-button'),
    ).not.toBeInTheDocument();
  });

  it('offers nothing to create before anything is typed', async () => {
    const { container } = renderAutocomplete({ showCreateOption: true });
    const input = container.querySelector('input')!;
    await userEvent.click(input);
    await waitForAutocomplete();

    expect(
      screen.queryByTestId('create-category-button'),
    ).not.toBeInTheDocument();
  });

  it('asks for a group before creating, then creates and selects', async () => {
    const { container, onSelect } = renderAutocomplete({
      showCreateOption: true,
    });
    await type(container, 'Takeaway');

    await userEvent.click(screen.getByTestId('create-category-button'));
    await waitForAutocomplete();

    // Step two: the list now shows groups, and nothing has been created or
    // selected yet.
    expect(categoryCreate).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId('Food-category-group-item')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('Food-category-group-item'));
    await waitForAutocomplete();

    expect(categoryCreate).toHaveBeenCalledWith({
      name: 'Takeaway',
      groupId: 'group-food',
      isIncome: false,
      hidden: false,
    });
    expect(onSelect).toHaveBeenCalledWith('new-category-id', 'Takeaway');
  });

  it('shows the new category in the field before the list refreshes', async () => {
    const { container } = renderAutocomplete({ showCreateOption: true });
    await type(container, 'Takeaway');

    await userEvent.click(screen.getByTestId('create-category-button'));
    await waitForAutocomplete();

    await userEvent.click(screen.getByTestId('Food-category-group-item'));
    await waitForAutocomplete();

    // `categoryGroups` never gains the new category here, standing in for the
    // real gap before the invalidated categories query refetches. The field
    // must still show what was just created, without waiting for a blur.
    expect(container.querySelector('input')!).toHaveValue('Takeaway');
  });

  it('stays on the group step so a failed creation can be retried', async () => {
    categoryCreate.mockRejectedValueOnce(new Error('category-create failed'));
    // The mutation logs the failure it reports to the user; keep it out of the
    // test output.
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { container, onSelect } = renderAutocomplete({
      showCreateOption: true,
    });
    await type(container, 'Takeaway');

    await userEvent.click(screen.getByTestId('create-category-button'));
    await waitForAutocomplete();

    await userEvent.click(screen.getByTestId('Food-category-group-item'));
    await waitForAutocomplete();

    // The mutation surfaces the error itself. Nothing is selected, and the
    // typed name is still held — the placeholder is the group step's — so the
    // user can retry instead of starting over.
    expect(onSelect).not.toHaveBeenCalled();
    expect(container.querySelector('input')!).toHaveAttribute(
      'placeholder',
      'Choose a group for "Takeaway"',
    );

    // Choosing a group closed the dropdown and left its name in the input, so
    // retrying means typing again — which is what reopens the list.
    await userEvent.clear(container.querySelector('input')!);
    await type(container, 'Food');

    await userEvent.click(screen.getByTestId('Food-category-group-item'));
    await waitForAutocomplete();

    expect(categoryCreate).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith('new-category-id', 'Takeaway');

    // setupTests reports unhandled rejections through console.error as
    // 'REJECTION', so the mutation's own log being the only entry is what
    // shows the rejection was handled rather than left dangling.
    expect(consoleError.mock.calls.map(call => String(call[0]))).toEqual([
      'Error creating category:',
    ]);
  });

  it('creates an income category when an income group is chosen', async () => {
    const { container } = renderAutocomplete({ showCreateOption: true });
    await type(container, 'Bonus');

    await userEvent.click(screen.getByTestId('create-category-button'));
    await waitForAutocomplete();

    await userEvent.click(screen.getByTestId('Income-category-group-item'));
    await waitForAutocomplete();

    expect(categoryCreate).toHaveBeenCalledWith({
      name: 'Bonus',
      groupId: 'group-income',
      isIncome: true,
      hidden: false,
    });
  });

  it('creates via the keyboard, without clicking', async () => {
    const { container, onSelect } = renderAutocomplete({
      showCreateOption: true,
    });
    await type(container, 'Takeaway');

    // Nothing matches, so the create row is the only option and is highlighted
    // because the input is non-empty. Enter goes through Downshift's key
    // handling rather than the click path the other tests exercise.
    await userEvent.keyboard('{Enter}');
    await waitForAutocomplete();

    expect(categoryCreate).not.toHaveBeenCalled();
    expect(screen.getByTestId('Food-category-group-item')).toBeInTheDocument();

    // The group step starts with an empty input, and Autocomplete highlights
    // nothing while blank (so a field can be left blank), so the group is
    // narrowed by typing — as with any other autocomplete here.
    await userEvent.keyboard('Food{Enter}');
    await waitForAutocomplete();

    expect(categoryCreate).toHaveBeenCalledWith({
      name: 'Takeaway',
      groupId: 'group-food',
      isIncome: false,
      hidden: false,
    });
    expect(onSelect).toHaveBeenCalledWith('new-category-id', 'Takeaway');
  });

  it('reaches a group with the arrow keys', async () => {
    const { container } = renderAutocomplete({ showCreateOption: true });
    await type(container, 'Bonus');

    await userEvent.keyboard('{Enter}');
    await waitForAutocomplete();

    // From no highlight, two ArrowDowns land on the second group.
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    await waitForAutocomplete();

    expect(categoryCreate).toHaveBeenCalledWith({
      name: 'Bonus',
      groupId: 'group-income',
      isIncome: true,
      hidden: false,
    });
  });

  it('does not select the create row when a category matches', async () => {
    const { container, onSelect } = renderAutocomplete({
      showCreateOption: true,
    });
    await type(container, 'Groceries');

    await userEvent.keyboard('{Enter}');
    await waitForAutocomplete();

    // The existing category must win, not a new one with the same name.
    expect(categoryCreate).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith('cat-groceries', expect.anything());
  });
});
