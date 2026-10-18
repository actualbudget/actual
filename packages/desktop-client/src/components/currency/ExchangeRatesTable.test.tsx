import { initServer } from '@actual-app/core/platform/client/connection';
import { setNumberFormat } from '@actual-app/core/shared/util';
import type { ExchangeRateEntity } from '@actual-app/core/types/models';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTestAppStore, TestProviders } from '#mocks';

import { ExchangeRatesTable, useDeleteRates } from './ExchangeRatesTable';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const rate: ExchangeRateEntity = {
  id: 'rate',
  from_currency: 'USD',
  to_currency: 'CAD',
  rate: 1.4,
  date: '2026-10-01',
  source: 'manual',
  created_at: null,
};

let store: ReturnType<typeof createTestAppStore>;
const updateRate = vi.fn();

function getNotifications() {
  return store.getState().notifications.notifications;
}

function renderTable() {
  render(
    <TestProviders store={store}>
      <ExchangeRatesTable exchangeRates={[rate]} onDeletePair={vi.fn()} />
    </TestProviders>,
  );
}

beforeEach(() => {
  store = createTestAppStore();
  updateRate.mockReset();
  initServer({
    'exchange-rate-update': updateRate,
    'exchange-rates-delete': () => {
      throw new Error('The database is locked');
    },
  });
});

afterEach(() => {
  setNumberFormat({ format: 'comma-dot', hideFraction: false });
});

describe('ExchangeRatesTable', () => {
  it('shows the inverse rate with the number format', () => {
    setNumberFormat({ format: 'dot-comma', hideFraction: false });
    renderTable();

    expect(screen.getByText('1 CAD = 0,714286 USD')).toBeInTheDocument();
  });

  it('says when an edited rate is not a valid rate', async () => {
    renderTable();

    await userEvent.click(screen.getByText('1.4'));
    const input = screen.getByDisplayValue('1.4');
    await userEvent.clear(input);
    await userEvent.type(input, 'abc{Enter}');

    expect(updateRate).not.toHaveBeenCalled();
    expect(getNotifications()).toEqual([
      expect.objectContaining({
        type: 'error',
        message: 'The rate must be a number from 0.000000001 to 1000000000.',
      }),
    ]);
  });

  it('saves an edited rate', async () => {
    renderTable();

    await userEvent.click(screen.getByText('1.4'));
    const input = screen.getByDisplayValue('1.4');
    await userEvent.clear(input);
    await userEvent.type(input, '1.39{Enter}');

    expect(updateRate).toHaveBeenCalledWith({ id: 'rate', rate: 1.39 });
    expect(getNotifications()).toEqual([]);
  });
});

describe('useDeleteRates', () => {
  it('says when the rates could not be deleted', async () => {
    const { result } = renderHook(() => useDeleteRates(), {
      wrapper: ({ children }) => (
        <TestProviders store={store}>{children}</TestProviders>
      ),
    });

    let isDeleted: boolean | undefined;
    await act(async () => {
      isDeleted = await result.current(['rate']);
    });

    expect(isDeleted).toBe(false);
    expect(getNotifications()).toEqual([
      expect.objectContaining({
        type: 'error',
        message: 'The exchange rates could not be deleted.',
        pre: 'The database is locked',
      }),
    ]);
  });
});
