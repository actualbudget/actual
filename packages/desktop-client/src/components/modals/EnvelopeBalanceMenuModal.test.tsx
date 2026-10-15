import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryFunding } from '@actual-app/core/server/budget/goal-template';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';

import { SheetNameProvider } from '#hooks/useSheetName';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { EnvelopeBalanceMenuModal } from './EnvelopeBalanceMenuModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));
vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string | { name: string }) => {
    const name = typeof binding === 'string' ? binding : binding.name;
    if (name.startsWith('leftover-')) return 65000;
    // A saved goal from an earlier Apply that matches what is budgeted.
    if (name.startsWith('goal-') || name.startsWith('budget-')) return 65000;
    return null;
  },
}));

const automated: CategoryEntity = {
  id: 'groceries',
  name: 'Groceries',
  group: 'usual',
  is_income: false,
  goal_def:
    '[{"type":"simple","monthly":800,"directive":"template","priority":0}]',
  template_settings: { source: 'ui' },
};

function renderModal(category: CategoryEntity, funding: CategoryFunding) {
  const client = createTestQueryClient();
  const store = configureTestAppStore({ queryClient: client });
  store.dispatch(mergeSyncedPrefs({ 'flags.goalTemplatesEnabled': 'true' }));
  initServer({
    'get-categories': async () => ({ grouped: [], list: [category] }),
    'budget/category-funding': async () => funding,
    query: async () => ({ data: [], dependencies: [] }),
  });
  render(
    <TestProviders queryClient={client} store={store}>
      <SheetNameProvider name="budget202401">
        <EnvelopeBalanceMenuModal month="2024-01" categoryId={category.id} />
      </SheetNameProvider>
    </TestProviders>,
  );
}

describe('EnvelopeBalanceMenuModal', () => {
  it('shows only the funding panel when the automation has live numbers', async () => {
    renderModal(automated, {
      budgeted: 65000,
      recommended: 80000,
      remaining: 15000,
    });
    expect(await screen.findByText('150.00 needed')).toBeInTheDocument();
    expect(screen.queryByText('Fully funded')).not.toBeInTheDocument();
  });

  it('keeps the saved goal summary for categories without automations', async () => {
    renderModal(
      { ...automated, goal_def: undefined },
      { budgeted: 65000, recommended: 80000, remaining: 15000 },
    );
    expect(await screen.findByText('Fully funded')).toBeInTheDocument();
    expect(
      screen.queryByTestId('category-funding-status'),
    ).not.toBeInTheDocument();
  });
});
