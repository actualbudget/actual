import type { ReactElement } from 'react';
import { Tree } from 'react-aria-components';
import { MemoryRouter } from 'react-router';

import { generateAccount } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';

import { accountQueries } from '#accounts';
import { SpreadsheetProvider } from '#hooks/useSpreadsheet';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { AccountRow } from './AccountRow';
import { AccountsHeaderRow } from './AccountsHeaderRow';
import { TreeItemEditingContext } from './treeItemEditing';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

window.matchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
});

const yen = {
  ...generateAccount('Yen'),
  id: 'yen',
  currency: 'JPY',
  currency_precision: 0,
};
const dinar = {
  ...generateAccount('Dinar'),
  id: 'kwd',
  currency: 'KWD',
  currency_precision: 3,
};

function renderWithEstimates(children: ReactElement) {
  initServer({
    query: async () => ({ data: [], dependencies: [] }),
    'get-cell': async () => ({ name: 'test-cell', value: 0 }),
    'accounts/current-estimates': async () => ({
      date: '2026-10-08',
      accounts: [
        {
          id: 'yen',
          nativeBalance: -1500,
          storedBaseAmount: -900,
          estimate: {
            status: 'resolved',
            baseAmount: -1000,
            rate: '150',
            kind: 'standing',
            source: 'manual',
            timestamp: '2026-09-01T00:00:00.000Z',
            fallback: false,
          },
        },
        {
          id: 'kwd',
          nativeBalance: -3100,
          storedBaseAmount: -1033,
          estimate: { status: 'unavailable' },
        },
      ],
      groups: {
        all: { storedBaseAmount: 0, convertedAmount: -1000, missing: ['kwd'] },
        onBudget: {
          storedBaseAmount: 0,
          convertedAmount: -1000,
          missing: ['kwd'],
        },
        offBudget: { storedBaseAmount: 0, convertedAmount: 0, missing: [] },
      },
    }),
  });
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(accountQueries.list().queryKey, [yen, dinar]);
  const store = configureTestAppStore({ queryClient });
  store.dispatch(
    mergeSyncedPrefs({
      'flags.currency': 'true',
      'flags.multicurrency': 'true',
      defaultCurrencyCode: 'USD',
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'USD',
        precision: 2,
      }),
    }),
  );
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <SpreadsheetProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </SpreadsheetProvider>
    </TestProviders>,
  );
}

const plain = (text: string | null | undefined) =>
  (text ?? '').replace(/[‪‬]/g, '');

describe('redesigned sidebar estimates', () => {
  it('describes the All accounts link and titles its balance', async () => {
    renderWithEstimates(
      <AccountsHeaderRow
        allOpen
        onToggleAll={vi.fn()}
        isToggleAllDisabled={false}
        isSearchOpen={false}
        onToggleSearch={vi.fn()}
      />,
    );
    const link = (await screen.findAllByRole('link')).find(
      el => el.getAttribute('href') === '/accounts',
    )!;
    await vi.waitFor(() =>
      expect(link.getAttribute('aria-describedby')).toBeTruthy(),
    );
    const description = document.getElementById(
      link.getAttribute('aria-describedby')!,
    );
    expect(plain(description?.textContent)).toMatch(
      /incomplete: rate unavailable for Dinar$/,
    );
    expect(
      await screen.findByTitle(title =>
        /^≈ -\$10\.00 at current rates/.test(plain(title)),
      ),
    ).toBeInTheDocument();
  });

  it('adds the estimate to a foreign account row', async () => {
    renderWithEstimates(
      <TreeItemEditingContext.Provider
        value={{ editingKey: null, setEditingKey: vi.fn() }}
      >
        <Tree aria-label="Accounts">
          <AccountRow account={yen} />
        </Tree>
      </TreeItemEditingContext.Provider>,
    );
    const row = await screen.findByRole('row');
    await vi.waitFor(() =>
      expect(plain(row.textContent)).toContain(
        '≈ -$10.00 at the current rate (1 JPY = 0.00666667 USD',
      ),
    );
    expect(plain(row.querySelector('[title]')?.getAttribute('title'))).toMatch(
      /Recorded base: -\$9\.00$/,
    );
  });
});
