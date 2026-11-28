import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { BalanceHistoryGraph } from './BalanceHistoryGraph';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// jsdom has no matchMedia, which the chart's animation settings read.
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

beforeEach(() => {
  initServer({ query: async () => ({ data: [], dependencies: [] }) });
});

describe('BalanceHistoryGraph', () => {
  it('names a labeled graph as a group', () => {
    render(
      <BalanceHistoryGraph
        accountId="jpy"
        aria-label="Balance history in USD (base)"
      />,
      { wrapper: TestProviders },
    );
    expect(
      screen.getByRole('group', { name: 'Balance history in USD (base)' }),
    ).toBeInTheDocument();
  });

  it('adds no role without a label', () => {
    render(<BalanceHistoryGraph accountId="usd" />, {
      wrapper: TestProviders,
    });
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('sums native amounts only for a foreign account', async () => {
    const queries: string[] = [];
    initServer({
      query: async query => {
        queries.push(JSON.stringify(query));
        // A sum answers with a number, a grouped query with rows.
        return {
          data: query.calculation ? 0 : [],
          dependencies: [],
        };
      },
    });
    const native = () =>
      queries.filter(query => query.includes('$transaction_amount'));

    const { unmount } = render(<BalanceHistoryGraph accountId="usd" />, {
      wrapper: TestProviders,
    });
    await waitFor(() => expect(queries).toHaveLength(2));
    // The monthly query selects native sums; nothing starts a native line.
    expect(native()).toHaveLength(1);
    unmount();

    queries.length = 0;
    render(
      <BalanceHistoryGraph
        accountId="jpy"
        native={{ currency: 'JPY', precision: 0 }}
      />,
      { wrapper: TestProviders },
    );
    await waitFor(() => expect(queries).toHaveLength(3));
    expect(native()).toHaveLength(2);
  });
});
