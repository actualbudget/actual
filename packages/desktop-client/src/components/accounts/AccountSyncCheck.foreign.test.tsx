import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { markAccountFailed } from '#accounts/accountsSlice';
import { AddExchangeRateModal } from '#components/modals/AddExchangeRateModal';
import { createTestAppStore, TestProviders } from '#mocks';

import { AccountSyncCheck } from './AccountSyncCheck';

const syncAndDownload = vi.fn();

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#components/common/Modal', () => ({
  Modal: ({
    children,
  }: {
    children: (state: { state: { close: () => void } }) => ReactNode;
  }) => children({ state: { close: vi.fn() } }),
  ModalHeader: () => null,
  ModalCloseButton: () => null,
}));
vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [{ id: 'yen', name: 'Yen', bank_sync_status: 'failed' }],
  }),
}));
vi.mock('#hooks/useCurrentAccess', () => ({
  useCurrentAccess: () => ({
    isAdmin: true,
    isFileOwner: true,
    cloudFileId: 'file-1',
  }),
}));
vi.mock('#accounts', () => ({
  useUnlinkAccountMutation: () => ({ mutate: vi.fn() }),
  useSyncAndDownloadMutation: () => ({ mutate: syncAndDownload }),
}));

it('offers to add the missing exchange rate, then syncs again', async () => {
  const store = createTestAppStore();
  store.dispatch(
    markAccountFailed({
      id: 'yen',
      errorType: 'RATE_UNAVAILABLE',
      errorCode: 'RATE_UNAVAILABLE',
      rate: { currencyCode: 'JPY', dates: ['2026-02-20'] },
    }),
  );
  render(
    <TestProviders store={store}>
      <MemoryRouter initialEntries={['/accounts/yen']}>
        <Routes>
          <Route path="/accounts/:id" element={<AccountSyncCheck />} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );

  fireEvent.click(screen.getByRole('button', { name: /connection problems/ }));
  expect(await screen.findByText(/2026-02-20/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add exchange rate' }));

  const [modal] = store.getState().modals.modalStack;
  expect(modal).toMatchObject({
    name: 'add-exchange-rate',
    options: { accountId: 'yen', currencyCode: 'JPY', dates: ['2026-02-20'] },
  });

  const save = vi.fn(async (): Promise<{ status: 'saved'; id: string }> => ({
    status: 'saved',
    id: 'rate',
  }));
  initServer({ 'exchange-rates/save': save });
  render(
    <TestProviders store={store}>
      <AddExchangeRateModal
        accountId="yen"
        currencyCode="JPY"
        dates={['2026-02-20']}
      />
    </TestProviders>,
  );
  fireEvent.change(screen.getByPlaceholderText('Rate'), {
    target: { value: '150' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save rate' }));
  await waitFor(() =>
    expect(syncAndDownload).toHaveBeenCalledWith({ id: 'yen' }),
  );
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'standing', date: '2026-02-20' }),
  );
});
