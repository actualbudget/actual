import { GridList } from 'react-aria-components';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SheetNameProvider } from '#hooks/useSheetName';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';

import { ExpenseCategoryListItem } from './ExpenseCategoryListItem';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));
vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: () => null,
}));
// Only the balance cell matters here; the other cells need schedule and
// spreadsheet providers that are unrelated to the balance menu
vi.mock('./BudgetCell', () => ({ BudgetCell: () => null }));
vi.mock('./SpentCell', () => ({ SpentCell: () => null }));

const category: CategoryEntity = {
  id: 'groceries',
  name: 'Groceries',
  group: 'usual',
  is_income: false,
};

function renderItem() {
  const onBudgetAction =
    vi.fn<(month: string, action: string, args: unknown) => void>();
  const client = createTestQueryClient();
  const store = configureTestAppStore({ queryClient: client });
  initServer({
    'get-categories': async () => ({ grouped: [], list: [category] }),
    query: async () => ({ data: [], dependencies: [] }),
  });
  render(
    <TestProviders queryClient={client} store={store}>
      <MemoryRouter>
        <SheetNameProvider name="budget202401">
          <GridList aria-label="Categories" items={[category]}>
            {item => (
              <ExpenseCategoryListItem
                value={item}
                month="2024-01"
                isHidden={false}
                show3Columns
                showBudgetedColumn
                onEditCategory={vi.fn()}
                onBudgetAction={onBudgetAction}
              />
            )}
          </GridList>
        </SheetNameProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return { onBudgetAction, store };
}

describe('ExpenseCategoryListItem', () => {
  it('funds the goal from To Budget through the envelope balance menu', async () => {
    const { onBudgetAction, store } = renderItem();

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Open balance menu for Groceries category',
      }),
    );

    const [modal] = store.getState().modals.modalStack;
    if (modal?.name !== 'envelope-balance-menu') {
      throw new Error(`Expected the envelope balance menu, got ${modal?.name}`);
    }
    const { options } = modal;
    expect(options.month).toBe('2024-01');

    act(() => options.onFundGoal?.(25000));

    expect(onBudgetAction).toHaveBeenCalledExactlyOnceWith(
      '2024-01',
      'transfer-available',
      { amount: 25000, category: 'groceries' },
    );
    expect(store.getState().modals.modalStack).toEqual([]);
    expect(store.getState().notifications.notifications).toEqual([
      expect.objectContaining({ message: 'Transferred 250.00 to Groceries' }),
    ]);
  });
});
