import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { toImportRows } from './ImportTransactionsModal';
import { MissingRateForm } from './MissingRateForm';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

it('saves a standing rate from the earliest missing date', async () => {
  const save = vi.fn(async () => ({ status: 'saved' as const, id: 'r' }));
  initServer({ 'exchange-rates/save': save });
  const onSaved = vi.fn();
  render(
    <TestProviders>
      <MissingRateForm
        dates={['2026-03-01', '2026-03-02']}
        currencyCode="JPY"
        onSaved={onSaved}
      />
    </TestProviders>,
  );
  expect(screen.getByText(/2026-03-01, 2026-03-02/)).toBeInTheDocument();
  await userEvent.type(
    document.querySelector<HTMLInputElement>('input[name="importRate"]')!,
    '150',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(save).toHaveBeenCalledWith({
    quoteCurrency: 'JPY',
    rate: '150',
    kind: 'standing',
    date: '2026-03-01',
  });
});

it('saves a rate typed in the other direction in stored form', async () => {
  const save = vi.fn(async () => ({ status: 'saved' as const, id: 'r' }));
  initServer({ 'exchange-rates/save': save });
  render(
    <TestProviders>
      <MissingRateForm
        dates={['2026-03-01']}
        currencyCode="JPY"
        onSaved={vi.fn()}
      />
    </TestProviders>,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Swap rate direction' }),
  );
  await userEvent.type(
    document.querySelector<HTMLInputElement>('input[name="importRate"]')!,
    '0.008',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save rate' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ rate: '125' })),
  );
});

it('sends a foreign account parsed amount as the native amount', () => {
  const row = { id: 'r', account: 'a', date: '2026-03-01', amount: -1500 };
  expect(toImportRows([row], true)).toEqual([
    { id: 'r', account: 'a', date: '2026-03-01', transaction_amount: -1500 },
  ]);
  expect(toImportRows([row], false)).toEqual([row]);
});
