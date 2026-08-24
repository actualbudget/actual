import type { AccountEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { useSyncAndDownloadMutation } from '#accounts';
import { useAccounts } from '#hooks/useAccounts';
import { useCurrentAccess } from '#hooks/useCurrentAccess';
import { useFailedAccounts } from '#hooks/useFailedAccounts';
import { TestProviders } from '#mocks';
import { useDispatch } from '#redux';

import { AccountSyncCheck } from './AccountSyncCheck';

vi.mock('react-router', async () => ({
  ...(await vi.importActual('react-router')),
  useParams: () => ({ id: 'acct1' }),
}));
vi.mock('#accounts', () => ({
  useSyncAndDownloadMutation: vi.fn(),
  useUnlinkAccountMutation: vi.fn(),
}));
vi.mock('#hooks/useAccounts', () => ({ useAccounts: vi.fn() }));
vi.mock('#hooks/useFailedAccounts', () => ({ useFailedAccounts: vi.fn() }));
vi.mock('#hooks/useCurrentAccess', () => ({ useCurrentAccess: vi.fn() }));
vi.mock('#redux', () => ({ useDispatch: vi.fn() }));

const goCardlessAccount = (id: string) =>
  ({
    id,
    name: `Account ${id}`,
    account_sync_source: 'goCardless',
    bank_sync_status: 'not-configured',
  }) as AccountEntity;

function setup({ isAdmin = true }: { isAdmin?: boolean } = {}) {
  const dispatch = vi.fn();
  const syncMutate = vi.fn();

  vi.mocked(useDispatch).mockReturnValue(dispatch);
  vi.mocked(useAccounts).mockReturnValue({
    data: [goCardlessAccount('acct1'), goCardlessAccount('acct2')],
  } as ReturnType<typeof useAccounts>);
  vi.mocked(useFailedAccounts).mockReturnValue(new Map());
  vi.mocked(useCurrentAccess).mockReturnValue({
    cloudFileId: 'file1',
    isAdmin,
    isFileOwner: true,
  });
  vi.mocked(useSyncAndDownloadMutation).mockReturnValue({
    mutate: syncMutate,
  } as unknown as ReturnType<typeof useSyncAndDownloadMutation>);

  render(<AccountSyncCheck />, { wrapper: TestProviders });

  return { dispatch, syncMutate };
}

async function openBanner() {
  await userEvent.click(
    screen.getByRole('button', { name: /connection problems/i }),
  );
}

describe('AccountSyncCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers the GoCardless setup shortcut to an administrator', async () => {
    setup();
    await openBanner();

    expect(
      screen.getByRole('button', { name: /set up gocardless/i }),
    ).toBeInTheDocument();
  });

  it('retries every account once the server credentials are back', async () => {
    // GoCardless credentials are server-global: restoring them fixes every
    // GoCardless account, not just the one whose banner was clicked.
    const { dispatch, syncMutate } = setup();
    await openBanner();
    await userEvent.click(
      screen.getByRole('button', { name: /set up gocardless/i }),
    );

    const { onSuccess } = dispatch.mock.calls[0][0].payload.modal.options;
    onSuccess();

    expect(syncMutate).toHaveBeenCalledWith({});
  });

  it('does not offer the shortcut to a user who cannot manage server secrets', async () => {
    setup({ isAdmin: false });
    await openBanner();

    expect(
      screen.queryByRole('button', { name: /set up gocardless/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/administrator/i)).toBeInTheDocument();
  });
});
