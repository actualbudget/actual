import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { toImportRows } from './ImportTransactionsModal';
import { MissingRateForm } from './MissingRateForm';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

it('returns the rate for every missing day without saving it', async () => {
  const save = vi.fn();
  initServer({ 'exchange-rates/save': save });
  const onSubmit = vi.fn();
  render(
    <TestProviders>
      <MissingRateForm
        dates={['2026-03-01', '2026-03-02']}
        currencyCode="JPY"
        onSubmit={onSubmit}
      />
    </TestProviders>,
  );
  expect(screen.getByText(/2026-03-01, 2026-03-02/)).toBeInTheDocument();
  await userEvent.type(
    document.querySelector<HTMLInputElement>('input[name="importRate"]')!,
    '0.008',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Use rate' }));
  expect(onSubmit).toHaveBeenCalledWith([
    { date: '2026-03-01', quoteCurrency: 'JPY', rate: '125' },
    { date: '2026-03-02', quoteCurrency: 'JPY', rate: '125' },
  ]);
  expect(save).not.toHaveBeenCalled();
});

it('returns a rate typed in the other direction in stored form', async () => {
  const onSubmit = vi.fn();
  render(
    <TestProviders>
      <MissingRateForm
        dates={['2026-03-01']}
        currencyCode="JPY"
        onSubmit={onSubmit}
      />
    </TestProviders>,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Swap rate direction' }),
  );
  await userEvent.type(
    document.querySelector<HTMLInputElement>('input[name="importRate"]')!,
    '125',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Use rate' }));
  expect(onSubmit).toHaveBeenCalledWith([
    { date: '2026-03-01', quoteCurrency: 'JPY', rate: '125' },
  ]);
});

it('sends a foreign account parsed amount as the native amount', () => {
  const row = { id: 'r', account: 'a', date: '2026-03-01', amount: -1500 };
  expect(toImportRows([row], true)).toEqual([
    { id: 'r', account: 'a', date: '2026-03-01', transaction_amount: -1500 },
  ]);
  expect(toImportRows([row], false)).toEqual([row]);
});
