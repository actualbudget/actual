import React from 'react';

import type { AccountEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccounts } from '#hooks/useAccounts';
import { useCurrentAccess } from '#hooks/useCurrentAccess';
import { useFailedAccounts } from '#hooks/useFailedAccounts';
import { TestProviders } from '#mocks';
import { pushModal } from '#modals/modalsSlice';

import { AccountSyncCheck } from './AccountSyncCheck';

const mockDispatch = vi.fn();

vi.mock('react-router', async importOriginal => ({
  ...(await importOriginal()),
  useParams: () => ({ id: 'acc-1' }),
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: vi.fn(),
}));

vi.mock('#hooks/useCurrentAccess', () => ({
  useCurrentAccess: vi.fn(),
}));

vi.mock('#hooks/useFailedAccounts', () => ({
  useFailedAccounts: vi.fn(),
}));

vi.mock('#accounts', () => ({
  useUnlinkAccountMutation: () => ({ mutate: vi.fn() }),
}));

vi.mock('#redux', async importOriginal => ({
  ...(await importOriginal()),
  useDispatch: () => mockDispatch,
}));

describe('AccountSyncCheck', () => {
  const baseAccount = {
    id: 'acc-1',
    name: 'Checking',
    bank_sync_status: 'failed',
    account_sync_source: 'goCardless',
    account_id: 'gocardless-acc-1',
    bank: 'bank-1',
  } as unknown as AccountEntity;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAccounts).mockReturnValue({
      data: [baseAccount],
      isLoading: false,
    } as ReturnType<typeof useAccounts>);
    vi.mocked(useCurrentAccess).mockReturnValue({
      isAdmin: true,
      isFileOwner: true,
      cloudFileId: 'file-1',
    });
  });

  it('renders clear error message and Configure button when GoCardless credentials are missing', async () => {
    vi.mocked(useFailedAccounts).mockReturnValue(
      new Map([
        [
          'acc-1',
          {
            type: 'GOCARDLESS_NOT_CONFIGURED',
            code: 'GOCARDLESS_NOT_CONFIGURED',
          },
        ],
      ]),
    );

    render(
      <TestProviders>
        <AccountSyncCheck />
      </TestProviders>,
    );

    // Click banner to open popover
    const bannerButton = screen.getByText(
      "This account is experiencing connection problems. Let's fix it.",
    );
    await userEvent.click(bannerButton);

    // Verify error message
    expect(
      screen.getByText(
        'Your GoCardless credentials are missing. Please re-enter them to restore bank sync.',
      ),
    ).toBeInTheDocument();

    // Verify Configure and Unlink buttons are shown
    const configureButton = screen.getByRole('button', { name: 'Configure' });
    expect(configureButton).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeInTheDocument();

    // Clicking Configure opens gocardless-init modal
    await userEvent.click(configureButton);
    expect(mockDispatch).toHaveBeenCalledWith(
      pushModal({
        modal: {
          name: 'gocardless-init',
          options: {
            onSuccess: expect.any(Function),
          },
        },
      }),
    );
  });

  it('renders Reauthorize button for expired authentication', async () => {
    vi.mocked(useFailedAccounts).mockReturnValue(
      new Map([
        [
          'acc-1',
          {
            type: 'ITEM_ERROR',
            code: 'ITEM_LOGIN_REQUIRED',
          },
        ],
      ]),
    );

    render(
      <TestProviders>
        <AccountSyncCheck />
      </TestProviders>,
    );

    const bannerButton = screen.getByText(
      "This account is experiencing connection problems. Let's fix it.",
    );
    await userEvent.click(bannerButton);

    expect(
      screen.getByText(
        'Your password or something else has changed with your bank and you need to login again.',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Reauthorize' }),
    ).toBeInTheDocument();
  });

  it('hides Configure button and only shows Unlink account for non-admin users', async () => {
    vi.mocked(useCurrentAccess).mockReturnValue({
      isAdmin: false,
      isFileOwner: false,
      cloudFileId: 'file-1',
    });
    vi.mocked(useFailedAccounts).mockReturnValue(
      new Map([
        [
          'acc-1',
          {
            type: 'GOCARDLESS_NOT_CONFIGURED',
            code: 'GOCARDLESS_NOT_CONFIGURED',
          },
        ],
      ]),
    );

    render(
      <TestProviders>
        <AccountSyncCheck />
      </TestProviders>,
    );

    const bannerButton = screen.getByText(
      "This account is experiencing connection problems. Let's fix it.",
    );
    await userEvent.click(bannerButton);

    expect(
      screen.getByText(
        'Your GoCardless credentials are missing. Please re-enter them to restore bank sync.',
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Configure' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Unlink account' }),
    ).toBeInTheDocument();
  });

  it('preserves GoCardless missing credentials error and Configure button across client reloads', async () => {
    vi.mocked(useAccounts).mockReturnValue({
      data: [
        {
          ...baseAccount,
          bank_sync_status: 'not-configured',
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useAccounts>);
    vi.mocked(useFailedAccounts).mockReturnValue(new Map());

    render(
      <TestProviders>
        <AccountSyncCheck />
      </TestProviders>,
    );

    const bannerButton = screen.getByText(
      "This account is experiencing connection problems. Let's fix it.",
    );
    await userEvent.click(bannerButton);

    expect(
      screen.getByText(
        'Your GoCardless credentials are missing. Please re-enter them to restore bank sync.',
      ),
    ).toBeInTheDocument();

    const configureButton = screen.getByRole('button', { name: 'Configure' });
    expect(configureButton).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeInTheDocument();

    await userEvent.click(configureButton);
    expect(mockDispatch).toHaveBeenCalledWith(
      pushModal({
        modal: {
          name: 'gocardless-init',
          options: {
            onSuccess: expect.any(Function),
          },
        },
      }),
    );
  });
});
