import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';

import { SheetNameProvider } from '#hooks/useSheetName';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';

import { EnvelopeIncomeBalanceMenuModal } from './EnvelopeIncomeBalanceMenuModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));

let sheetValues: Record<string, number | boolean | null> = {};

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string | { name: string }) => {
    const name = typeof binding === 'string' ? binding : binding.name;
    return sheetValues[name] ?? null;
  },
}));

const category: CategoryEntity = {
  id: 'salary',
  name: 'Salary',
  group: 'income',
  is_income: true,
};

function renderModal({ managed = true } = {}) {
  sheetValues = {
    'buffered-managed': managed,
    frozen: false,
    'carryover-salary': 1,
    'sum-amount-salary': 520000,
  };
  const client = createTestQueryClient();
  const store = configureTestAppStore({ queryClient: client });
  initServer({
    'get-categories': async () => ({ grouped: [], list: [category] }),
    query: async () => ({ data: [], dependencies: [] }),
  });
  render(
    <TestProviders queryClient={client} store={store}>
      <SheetNameProvider name="budget202611">
        <EnvelopeIncomeBalanceMenuModal
          categoryId={category.id}
          onCarryover={vi.fn()}
          onShowActivity={vi.fn()}
        />
      </SheetNameProvider>
    </TestProviders>,
  );
}

// The sheet renders in a portal; the arrow is the header's 15px icon
function rolloverArrow() {
  return document.body.querySelector('svg[width="15"][height="15"]');
}

describe('EnvelopeIncomeBalanceMenuModal', () => {
  it('hides the auto hold toggle and the rollover arrow in a managed month', async () => {
    renderModal();

    expect(await screen.findByText('View transactions')).toBeInTheDocument();
    expect(screen.queryByText('Disable auto hold')).not.toBeInTheDocument();
    expect(rolloverArrow()).toBeNull();
  });

  it('shows both in manual mode', async () => {
    renderModal({ managed: false });

    expect(await screen.findByText('Disable auto hold')).toBeInTheDocument();
    expect(rolloverArrow()).not.toBeNull();
  });
});
