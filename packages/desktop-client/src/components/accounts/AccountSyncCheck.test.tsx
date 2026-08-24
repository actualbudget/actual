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

const goCardlessAccount = (
  id: string,
  bank_sync_status: AccountEntity['bank_sync_status'] = 'not-configured',
) =>
  ({
    id,
    name: `Account ${id}`,
    account_sync_source: 'goCardless',
    bank_sync_status,
  }) as AccountEntity;

const simpleFinAccount = (id: string) =>
  ({
    id,
    name: `Account ${id}`,
    account_sync_source: 'simpleFin',
  }) as AccountEntity;

function setup({
  isAdmin = true,
  failedSyncError,
}: {
  isAdmin?: boolean;
  failedSyncError?: { type: string; code: string };
} = {}) {
  const dispatch = vi.fn();
  const syncMutate = vi.fn();

  vi.mocked(useDispatch).mockReturnValue(dispatch);
  vi.mocked(useAccounts).mockReturnValue({
    data: [
      goCardlessAccount('acct1'),
      goCardlessAccount('acct2'),
      simpleFinAccount('acct3'),
      goCardlessAccount('acct4', 'ok'),
      goCardlessAccount('acct5', 'invalid-credentials'),
    ],
  } as ReturnType<typeof useAccounts>);
  vi.mocked(useFailedAccounts).mockReturnValue(
    failedSyncError
      ? new Map([['acct1', failedSyncError]])
      : new Map<string, { type: string; code: string }>(),
  );
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

  it('retries the GoCardless accounts the missing credentials broke, and only those', async () => {
    // GoCardless credentials are server-global, so restoring them fixes every
    // GoCardless account that failed for want of them — not just the one whose
    // banner was clicked. But it is only those: accounts on other providers
    // were never broken, and healthy GoCardless accounts (acct4) would be
    // resynced for nothing, spending the institution's request allowance.
    const { dispatch, syncMutate } = setup();
    await openBanner();
    await userEvent.click(
      screen.getByRole('button', { name: /set up gocardless/i }),
    );

    const { onSuccess } = dispatch.mock.calls[0][0].payload.modal.options;
    onSuccess();

    expect(syncMutate).toHaveBeenCalledWith({
      ids: ['acct1', 'acct2', 'acct5'],
    });
  });

  it('keeps offering the shortcut when the entered credentials were rejected', async () => {
    // a typo in the replacement secrets has to lead back to the form, not to
    // the generic internal-error dead end the fix exists to remove
    setup({
      failedSyncError: {
        type: 'CONFIG_ERROR',
        code: 'GOCARDLESS_INVALID_CREDENTIALS',
      },
    });
    await openBanner();

    expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /set up gocardless/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /unlink/i }),
    ).not.toBeInTheDocument();
  });

  it('does not offer the shortcut to a user who cannot manage server secrets', async () => {
    setup({ isAdmin: false });
    await openBanner();

    expect(
      screen.queryByRole('button', { name: /set up gocardless/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/administrator/i)).toBeInTheDocument();
  });

  it('never offers unlinking as the way out of a server configuration problem', async () => {
    // The bank link is fine — the server just lost its secrets. Unlinking
    // throws away a working link and forces a fresh consent at the bank, and
    // for a non-admin it was the only button on offer.
    setup({ isAdmin: false });
    await openBanner();

    expect(
      screen.queryByRole('button', { name: /unlink/i }),
    ).not.toBeInTheDocument();
  });

  it('does not offer unlinking to a non-admin whose credentials were rejected either', async () => {
    setup({
      isAdmin: false,
      failedSyncError: {
        type: 'CONFIG_ERROR',
        code: 'GOCARDLESS_INVALID_CREDENTIALS',
      },
    });
    await openBanner();

    expect(
      screen.queryByRole('button', { name: /unlink/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/administrator/i)).toBeInTheDocument();
  });

  it('still offers unlinking for failures unlinking can actually resolve', async () => {
    // guards the fix above from over-reaching: a genuinely broken account must
    // keep its escape hatch
    setup({
      isAdmin: false,
      failedSyncError: { type: 'ACCOUNT_MISSING', code: 'ACCOUNT_MISSING' },
    });
    await openBanner();

    expect(
      screen.getByRole('button', { name: /unlink account/i }),
    ).toBeInTheDocument();
  });
});
