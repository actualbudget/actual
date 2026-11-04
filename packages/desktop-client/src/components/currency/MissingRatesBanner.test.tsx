import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useExchangeRates } from '#hooks/useExchangeRates';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { TestProviders } from '#mocks';

import { MissingRatesBanner } from './MissingRatesBanner';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#hooks/useMultiCurrency', () => ({ useMultiCurrency: vi.fn() }));
vi.mock('#hooks/useExchangeRates', () => ({ useExchangeRates: vi.fn() }));

const missingUsd = {
  currency: 'USD',
  isOutdated: false,
  outdatedSince: null,
  olderTransactionsFrom: null,
  holes: { startDate: '2026-06-10', endDate: '2026-06-11' },
};

describe('MissingRatesBanner', () => {
  const update = vi.fn();
  const findMissing = vi.fn();

  function renderBanner(currency: string | null) {
    const banner = (account: { currency: string | null }) => (
      <TestProviders>
        <MissingRatesBanner account={account} />
      </TestProviders>
    );
    const result = render(banner({ currency }));
    return {
      ...result,
      // The desktop account page keeps the banner when moving to another
      // account
      moveTo: (other: string | null) =>
        result.rerender(banner({ currency: other })),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMultiCurrency).mockReturnValue({
      isEnabled: true,
      defaultCurrencyCode: 'CAD',
      getAccountCurrency: account => account.currency || 'CAD',
    });
    vi.mocked(useExchangeRates).mockReturnValue({
      exchangeRates: [],
      rateIndex: buildRateIndex([]),
      isLoading: false,
    });
    update.mockResolvedValue({
      added: 2,
      updated: 0,
      unchanged: 0,
      unsupported: [],
      errors: [],
      time: '2026-10-23T12:00:00.000Z',
    });
    findMissing.mockResolvedValue([missingUsd]);
    initServer({
      'exchange-rates-missing': findMissing,
      'exchange-rates-update': update,
    });
  });

  afterEach(async () => {
    await clearServer();
  });

  it('warns on an account whose currency is missing rates', async () => {
    renderBanner('USD');

    expect(
      await screen.findByText(/Some USD exchange rates are missing/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/rates between .* are missing/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Update now' }));
    expect(update).toHaveBeenCalled();
  });

  it('shows the error of an update that failed', async () => {
    update.mockResolvedValue({
      added: 0,
      updated: 0,
      unchanged: 0,
      unsupported: [],
      errors: ['offline'],
      time: '2026-10-23T12:00:00.000Z',
    });
    renderBanner('USD');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Update now' }),
    );

    expect(
      await screen.findByText('Could not update: offline'),
    ).toBeInTheDocument();
  });

  it('can be dismissed for each currency, also when moving between accounts', async () => {
    // Currencies no other test dismisses, as dismissals last for the session
    findMissing.mockResolvedValue([
      { ...missingUsd, currency: 'COP' },
      { ...missingUsd, currency: 'GBP' },
    ]);
    const { moveTo } = renderBanner('COP');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Dismiss' }),
    );
    expect(
      screen.queryByText(/Some COP exchange rates are missing/),
    ).not.toBeInTheDocument();

    moveTo('GBP');
    expect(
      await screen.findByText(/Some GBP exchange rates are missing/),
    ).toBeInTheDocument();

    moveTo('COP');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('stays hidden on an account whose currency has every rate', async () => {
    renderBanner('EUR');

    await waitFor(() => expect(findMissing).toHaveBeenCalled());
    // Let the answer render
    await act(() => Promise.resolve());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not check accounts in the default currency', () => {
    renderBanner(null);

    expect(findMissing).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
