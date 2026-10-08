import type { ReactNode } from 'react';

import {
  initServer,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { onlineManager } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';

import { accountQueries } from '#accounts';
import { useCurrentEstimates } from '#hooks/useCurrentEstimates';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CurrentEstimateLines } from './CurrentEstimateLines';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const accounts = [
  { id: 'usd', name: 'Checking', offbudget: 0, currency: null },
  {
    id: 'yen',
    name: 'Yen',
    offbudget: 0,
    currency: 'JPY',
    currency_precision: 0,
  },
  {
    id: 'kwd',
    name: 'Dinar',
    offbudget: 0,
    currency: 'KWD',
    currency_precision: 3,
  },
] as AccountEntity[];

const estimates = {
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
    all: { storedBaseAmount: 48067, convertedAmount: 49000, missing: ['kwd'] },
    onBudget: {
      storedBaseAmount: 48067,
      convertedAmount: 49000,
      missing: ['kwd'],
    },
    offBudget: { storedBaseAmount: 0, convertedAmount: 0, missing: [] },
  },
};

// Currency symbols are wrapped in bidi isolation marks.
const plain = (expected: string) => (content: string) =>
  content.replace(/[\u202a\u202c]/g, '') === expected;

function setup(read = vi.fn().mockResolvedValue(estimates)) {
  initServer({ 'accounts/current-estimates': read as never });
  const store = createTestAppStore();
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
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(accountQueries.list().queryKey, accounts);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={queryClient}>
      {children}
    </TestProviders>
  );
  return { read, wrapper };
}

describe('CurrentEstimateLines', () => {
  it("shows a foreign account's estimate and recorded base", async () => {
    const { wrapper } = setup();
    render(<CurrentEstimateLines account={accounts[1]} accountId="yen" />, {
      wrapper,
    });
    expect(
      await screen.findByText(
        plain(
          '≈ -$10.00 at the current rate (1 JPY = 0.00666667 USD, manual standing rate from 2026-09-01)',
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(plain('Recorded base: -$9.00')),
    ).toBeInTheDocument();
  });

  it('says when the rate is unavailable', async () => {
    const { wrapper } = setup();
    render(<CurrentEstimateLines account={accounts[2]} accountId="kwd" />, {
      wrapper,
    });
    expect(
      await screen.findByText('Current-rate estimate: rate unavailable'),
    ).toBeInTheDocument();
  });

  it("marks All accounts' converted total incomplete", async () => {
    const { wrapper } = setup();
    render(<CurrentEstimateLines />, { wrapper });
    expect(
      await screen.findByText(
        plain(
          '≈ $490.00 at current rates, incomplete: rate unavailable for Dinar',
        ),
      ),
    ).toBeInTheDocument();
  });

  it('shows nothing for budget-currency accounts and after a failed read', async () => {
    const { wrapper } = setup(vi.fn().mockRejectedValue(new Error('boom')));
    const { container } = render(<CurrentEstimateLines />, { wrapper });
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    const ok = setup();
    const base = render(
      <CurrentEstimateLines account={accounts[0]} accountId="usd" />,
      { wrapper: ok.wrapper },
    );
    await waitFor(() => expect(ok.read).toHaveBeenCalled());
    expect(base.container).toBeEmptyDOMElement();
  });
});

describe('useCurrentEstimates', () => {
  it('hides estimates after a failed refetch until a read succeeds', async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce(estimates)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(estimates);
    const { wrapper } = setup(read);
    const { result } = renderHook(() => useCurrentEstimates(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());

    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await waitFor(() => expect(result.current).toBeNull());

    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await waitFor(() => expect(result.current).not.toBeNull());
  });

  it("reuses the day's result for displays mounted later", async () => {
    const { read, wrapper } = setup();
    const first = renderHook(() => useCurrentEstimates(), { wrapper });
    await waitFor(() => expect(first.result.current).not.toBeNull());
    const later = renderHook(() => useCurrentEstimates(), { wrapper });
    expect(later.result.current).not.toBeNull();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('reads once per change however many displays use it, even offline', async () => {
    const { read, wrapper } = setup();
    const { result } = renderHook(
      () => [useCurrentEstimates(), useCurrentEstimates()],
      { wrapper },
    );
    await waitFor(() => expect(result.current[0]).not.toBeNull());
    expect(read).toHaveBeenCalledTimes(1);

    onlineManager.setOnline(false);
    onTestFinished(() => onlineManager.setOnline(true));
    serverPush('sync-event', { type: 'applied', tables: ['accounts'] });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('rereads after relevant sync changes only', async () => {
    const { read, wrapper } = setup();
    const { result } = renderHook(() => useCurrentEstimates(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(read).toHaveBeenCalledTimes(1);

    serverPush('sync-event', { type: 'applied', tables: ['payees'] });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(read).toHaveBeenCalledTimes(1);

    serverPush('sync-event', { type: 'applied', tables: ['exchange_rates'] });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  });
});
