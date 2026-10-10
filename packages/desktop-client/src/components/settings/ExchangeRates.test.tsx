import { send } from '@actual-app/core/platform/client/connection';
import type { Query } from '@actual-app/core/shared/query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';
import { aqlQuery } from '#queries/aqlQuery';

import { ExchangeRateSettings } from './ExchangeRates';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  listen: vi.fn(() => vi.fn()),
}));
vi.mock('#queries/aqlQuery', () => ({ aqlQuery: vi.fn() }));
vi.mock('#hooks/useMulticurrencyAvailable', () => ({
  useMulticurrencyAvailable: () => true,
}));
const budget = vi.hoisted(() => ({ currency: 'USD' }));
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: () => [budget.currency, vi.fn()],
}));
vi.mock('./Currency', () => ({
  useCurrencyOptions: () => [
    ['', 'None'],
    ['USD', 'US Dollar'],
    ['JPY', 'Japanese Yen'],
    ['EUR', 'Euro'],
  ],
}));

const row = {
  id: 'r1',
  base_currency: 'USD',
  quote_currency: 'JPY',
  rate: '150',
  kind: 'standing',
  source: 'manual',
  timestamp: '2026-01-01T00:00:00.000Z',
};

const fetched = {
  status: 'resolved',
  rate: '151',
  kind: 'fetched',
  source: 'ecb',
  timestamp: '2026-03-01T00:00:00.000Z',
  fallback: false,
};

type Sent = (name: string, args?: unknown) => Promise<unknown>;

describe('ExchangeRateSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    budget.currency = 'USD';
    vi.mocked(aqlQuery).mockResolvedValue({ data: [row], dependencies: [] });
  });

  it('lists only rates saved under the budget currency', async () => {
    vi.mocked(send).mockResolvedValue(fetched);
    render(<ExchangeRateSettings />, { wrapper: TestProviders });
    await screen.findByText(/JPY \(Japanese Yen\): 150/);
    const query = vi.mocked(aqlQuery).mock.calls[0][0] as Query;
    expect(query.serialize().filterExpressions).toEqual([
      { base_currency: 'USD' },
    ]);
  });

  it('names the source of a fetched rate', async () => {
    vi.mocked(send).mockResolvedValue(fetched);
    render(<ExchangeRateSettings />, { wrapper: TestProviders });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(
      await screen.findByTestId('exchange-rate-estimate-preview'),
    ).toHaveTextContent('fetched rate 151 from 2026-03-01 (ecb)');
  });

  it('shows a failed resolution instead of a stale one', async () => {
    vi.mocked(send).mockRejectedValue(new Error('rate-same-currency'));
    render(<ExchangeRateSettings />, { wrapper: TestProviders });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(
      await screen.findByTestId('exchange-rate-entry-preview'),
    ).toHaveTextContent('The rate could not be loaded.');
  });

  it('locks the form while a save is pending', async () => {
    let finish: ((value: unknown) => void) | undefined;
    vi.mocked(send).mockImplementation(((name: string) =>
      name === 'exchange-rates/save'
        ? new Promise(resolve => {
            finish = resolve;
          })
        : Promise.resolve(fetched)) as Sent);
    render(<ExchangeRateSettings />, { wrapper: TestProviders });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(screen.getByDisplayValue('150')).toBeDisabled();
    finish?.({ status: 'saved' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled(),
    );
  });

  it('drops a pending duplicate and the draft when the budget currency changes', async () => {
    let answer: ((value: unknown) => void) | undefined;
    vi.mocked(send).mockImplementation(((name: string) =>
      name === 'exchange-rates/save'
        ? new Promise(resolve => {
            answer = resolve;
          })
        : Promise.resolve(fetched)) as Sent);
    const { rerender } = render(<ExchangeRateSettings />, {
      wrapper: TestProviders,
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
    // The EUR rows have not arrived yet.
    vi.mocked(aqlQuery).mockReturnValue(new Promise(() => undefined));
    budget.currency = 'EUR';
    rerender(<ExchangeRateSettings />);
    // Rows, draft and the USD/JPY response belong to the old budget currency.
    expect(screen.queryByText(/JPY \(Japanese Yen\): 150/)).toBeNull();
    expect(screen.queryByDisplayValue('150')).toBeNull();
    answer?.({
      status: 'duplicate',
      existing: { rate: '140', kind: 'standing' },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save rate' })).toBeEnabled(),
    );
    expect(
      screen.queryByRole('button', { name: 'Replace saved rate' }),
    ).toBeNull();
    expect(
      vi
        .mocked(send)
        .mock.calls.filter(([name]) => name === 'exchange-rates/save'),
    ).toHaveLength(1);
  });
});
