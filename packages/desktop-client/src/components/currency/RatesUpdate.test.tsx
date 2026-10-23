import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useExchangeRates } from '#hooks/useExchangeRates';
import { TestProviders } from '#mocks';

import { RatesUpdate } from './RatesUpdate';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#hooks/useExchangeRates', () => ({ useExchangeRates: vi.fn() }));

// Midday, so the day is the same in every time zone the tests run in
const status = {
  added: 0,
  updated: 0,
  unchanged: 0,
  unsupported: [],
  errors: [],
  time: '2026-10-23T12:00:00.000Z',
};

const missingUsd = {
  currency: 'USD',
  isOutdated: false,
  outdatedSince: null,
  olderTransactionsFrom: null,
  holes: { startDate: '2026-06-10', endDate: '2026-06-11' },
};

describe('RatesUpdate', () => {
  const getStatus = vi.fn();
  const findMissing = vi.fn();
  const update = vi.fn();

  function renderUpdate() {
    const view = () => (
      <TestProviders>
        <RatesUpdate />
      </TestProviders>
    );
    const result = render(view());
    return { rerender: () => result.rerender(view()) };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useExchangeRates).mockReturnValue({
      exchangeRates: [],
      rateIndex: buildRateIndex([]),
      isLoading: false,
    });
    getStatus.mockResolvedValue(status);
    findMissing.mockResolvedValue([]);
    update.mockResolvedValue({ ...status, added: 5 });
    initServer({
      'exchange-rates-update-status': getStatus,
      'exchange-rates-missing': findMissing,
      'exchange-rates-update': update,
    });
  });

  afterEach(async () => {
    await clearServer();
  });

  it('shows the day of the last update', async () => {
    renderUpdate();

    expect(
      await screen.findByText('Up to date as of 10/23/2026.'),
    ).toBeInTheDocument();
  });

  it('counts the rates an update added', async () => {
    renderUpdate();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Get missing rates from Frankfurter',
      }),
    );

    expect(
      await screen.findByText('Last updated on 10/23/2026: 5 new rates.'),
    ).toBeInTheDocument();
  });

  it('loads the last update again when rates change', async () => {
    const { rerender } = renderUpdate();
    await screen.findByText('Up to date as of 10/23/2026.');

    getStatus.mockResolvedValue({ ...status, added: 3 });
    vi.mocked(useExchangeRates).mockReturnValue({
      exchangeRates: [],
      rateIndex: buildRateIndex([]),
      isLoading: false,
    });
    rerender();

    expect(
      await screen.findByText('Last updated on 10/23/2026: 3 new rates.'),
    ).toBeInTheDocument();
  });

  it('shows why an update failed instead of being up to date', async () => {
    update.mockResolvedValue({
      ...status,
      unsupported: ['XAF'],
      errors: ['offline'],
    });
    renderUpdate();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Get missing rates from Frankfurter',
      }),
    );

    expect(
      await screen.findByText('Could not update: offline'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Frankfurter has no rates for XAF.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Up to date/)).not.toBeInTheDocument();
  });

  it('lists missing rates again when rates change', async () => {
    findMissing.mockResolvedValue([missingUsd]);
    const { rerender } = renderUpdate();
    expect(
      await screen.findByText(/Some USD rates between .* are missing/),
    ).toBeInTheDocument();

    findMissing.mockResolvedValue([]);
    vi.mocked(useExchangeRates).mockReturnValue({
      exchangeRates: [],
      rateIndex: buildRateIndex([]),
      isLoading: false,
    });
    rerender();

    await waitFor(() =>
      expect(
        screen.queryByText(/Some USD rates between .* are missing/),
      ).not.toBeInTheDocument(),
    );
    expect(findMissing).toHaveBeenCalledTimes(2);
  });
});
