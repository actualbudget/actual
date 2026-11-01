import type { ReactNode } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';

import { accountQueries } from '#accounts';
import { SheetNameProvider } from '#hooks/useSheetName';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { TotalsList } from './TotalsList';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('@actual-app/components/tooltip', () => ({
  Tooltip: ({
    children,
    content,
  }: {
    children: ReactNode;
    content: ReactNode;
  }) => (
    <div>
      {children}
      <aside>{content}</aside>
    </div>
  ),
}));
const cells: Record<string, number | boolean> = {};
vi.mock('#hooks/useSpreadsheet', () => ({
  useSpreadsheet: () => ({
    bind: (
      sheet: string,
      binding: string | { name: string },
      cb: (node: { name: string; value: number | boolean }) => void,
    ) => {
      const name = typeof binding === 'string' ? binding : binding.name;
      cb({ name: `${sheet}!${name}`, value: cells[name] ?? 0 });
      return () => undefined;
    },
  }),
}));
const plain = (s: string) => (content: string) =>
  content.replace(/[‪‬]/g, '') === s;

function renderTotals(changes: number, incomplete: boolean) {
  for (const key of Object.keys(cells)) delete cells[key];
  Object.assign(cells, {
    'reservation-changes': changes,
    'reservation-incomplete': incomplete,
  });
  const store = createTestAppStore();
  store.dispatch(mergeSyncedPrefs({ defaultCurrencyCode: 'USD' }));
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(accountQueries.list().queryKey, []);
  initServer({ 'budget/fx-valuation': vi.fn() });
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <SheetNameProvider name="envelope-budget202601">
        <TotalsList month="2026-01" prevMonthName="Dec" />
      </SheetNameProvider>
    </TestProviders>,
  );
}

// MC-10.3: the To Budget summary names the reservation it subtracts.
it('BR1 shows the reservation To Budget subtracts as its own line', () => {
  renderTotals(12500, false);
  expect(screen.getByText('Reserved in other currencies')).toBeVisible();
  expect(screen.getByText(plain('-$125.00'))).toBeVisible();
  expect(screen.queryByText('Reservation incomplete')).toBeNull();
});

it('marks an incomplete reservation even at zero', () => {
  renderTotals(0, true);
  expect(screen.getByText('Reserved in other currencies')).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Reservation incomplete',
  );
});

it('omits the line without reservations', () => {
  renderTotals(0, false);
  expect(screen.queryByText('Reserved in other currencies')).toBeNull();
});
