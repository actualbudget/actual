import { useState } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';
import { setAppLockEnabled } from '#util/appLock';
import type { AppLockStatus } from '#util/appLock';

import { AppLockSettings } from './AppLockSettings';

vi.mock('#util/appLock', () => ({ setAppLockEnabled: vi.fn() }));

const baseStatus: AppLockStatus = {
  isAvailable: true,
  isEnabled: false,
  biometry: 'faceId',
};

type HarnessProps = { initialStatus: AppLockStatus };

function Harness({ initialStatus }: HarnessProps) {
  const [status, setStatus] = useState(initialStatus);
  return <AppLockSettings status={status} onStatusChange={setStatus} />;
}

function renderWithStatus(status: Partial<AppLockStatus> = {}) {
  render(<Harness initialStatus={{ ...baseStatus, ...status }} />, {
    wrapper: TestProviders,
  });
}

describe('AppLockSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names the biometry the device offers', () => {
    renderWithStatus({ biometry: 'touchId' });

    expect(screen.getByText(/require touch id/i)).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'App lock' }),
    ).not.toBeChecked();
  });

  it('turns the lock on once the user has authenticated', async () => {
    vi.mocked(setAppLockEnabled).mockResolvedValue({
      ...baseStatus,
      isEnabled: true,
    });

    renderWithStatus();
    await userEvent.click(screen.getByRole('checkbox', { name: 'App lock' }));

    expect(setAppLockEnabled).toHaveBeenCalledWith(true, 'Turn on app lock');
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'App lock' })).toBeChecked(),
    );
  });

  it('leaves the lock off when authentication is cancelled', async () => {
    vi.mocked(setAppLockEnabled).mockResolvedValue(baseStatus);

    renderWithStatus();
    const checkbox = screen.getByRole('checkbox', { name: 'App lock' });
    await userEvent.click(checkbox);

    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(checkbox).not.toBeChecked();
  });

  it('cannot be turned on when the device has no passcode', () => {
    renderWithStatus({ isAvailable: false, biometry: 'none' });

    expect(screen.getByRole('checkbox', { name: 'App lock' })).toBeDisabled();
    expect(
      screen.getByText(/set a passcode on this device/i),
    ).toBeInTheDocument();
  });
});
