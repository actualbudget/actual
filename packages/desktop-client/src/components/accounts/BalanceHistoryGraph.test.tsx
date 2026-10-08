import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';

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
});
