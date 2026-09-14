import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { useCreateCategoryMutation } from '#budget/mutations';
import { SpreadsheetProvider } from '#hooks/useSpreadsheet';
import { createTestQueryClient, TestProviders } from '#mocks';

import { CategoryAutocomplete } from './CategoryAutocomplete';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

vi.mock('#budget/mutations', () => ({
  useCreateCategoryMutation: vi.fn(),
}));

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
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // CategoryItem reads balances through the spreadsheet even when they are
    // hidden, so the provider needs a backing server.
    initServer({
      query: async () => ({ data: [], dependencies: [] }),
      'get-cell': async () => ({ name: 'test-cell', value: 0 }),
    });
    mutateAsync.mockResolvedValue('new-category-id');
    vi.mocked(useCreateCategoryMutation).mockReturnValue({
      mutateAsync,
    } as unknown as ReturnType<typeof useCreateCategoryMutation>);
  });

  function renderAutocomplete(props?: { showCreateOption?: boolean }) {
    const onSelect = vi.fn();

    render(
      <TestProviders queryClient={queryClient}>
        <SpreadsheetProvider>
          <div data-testid="autocomplete-test">
            <CategoryAutocomplete
              categoryGroups={categoryGroups}
              value={null}
              type="single"
              embedded={false}
              // Mirrors TransactionsTable: the cell keeps the input focused,
              // which is what reopens the dropdown after switching steps.
              focused
              showBalances={false}
              onSelect={onSelect}
              {...props}
            />
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
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId('Food-category-group-item')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('Food-category-group-item'));
    await waitForAutocomplete();

    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'Takeaway',
      groupId: 'group-food',
      isIncome: false,
      isHidden: false,
    });
    expect(onSelect).toHaveBeenCalledWith('new-category-id', 'Takeaway');
  });

  it('creates an income category when an income group is chosen', async () => {
    const { container } = renderAutocomplete({ showCreateOption: true });
    await type(container, 'Bonus');

    await userEvent.click(screen.getByTestId('create-category-button'));
    await waitForAutocomplete();

    await userEvent.click(screen.getByTestId('Income-category-group-item'));
    await waitForAutocomplete();

    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'Bonus',
      groupId: 'group-income',
      isIncome: true,
      isHidden: false,
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

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByTestId('Food-category-group-item')).toBeInTheDocument();

    // The group step starts with an empty input, and Autocomplete highlights
    // nothing while blank (so a field can be left blank), so the group is
    // narrowed by typing — as with any other autocomplete here.
    await userEvent.keyboard('Food{Enter}');
    await waitForAutocomplete();

    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'Takeaway',
      groupId: 'group-food',
      isIncome: false,
      isHidden: false,
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

    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'Bonus',
      groupId: 'group-income',
      isIncome: true,
      isHidden: false,
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
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith('cat-groceries', expect.anything());
  });
});
