import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';
import {
  getAppLockStatus,
  isAppLockSupported,
  setAppLockEnabled,
} from '#util/appLock';
import type { AppLockStatus } from '#util/appLock';

import { AppLockSettings } from './AppLockSettings';

vi.mock('#util/appLock', () => ({
  isAppLockSupported: vi.fn(),
  getAppLockStatus: vi.fn(),
  setAppLockEnabled: vi.fn(),
}));

function mockStatus(status: Partial<AppLockStatus> = {}) {
  vi.mocked(isAppLockSupported).mockReturnValue(true);
  vi.mocked(getAppLockStatus).mockResolvedValue({
    isAvailable: true,
    isEnabled: false,
    biometry: 'faceId',
    ...status,
  });
}

describe('AppLockSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing where the app lock is not supported', () => {
    vi.mocked(isAppLockSupported).mockReturnValue(false);

    const { container } = render(<AppLockSettings />, {
      wrapper: TestProviders,
    });

    expect(container.firstChild).toBeNull();
    expect(getAppLockStatus).not.toHaveBeenCalled();
  });

  it('names the biometry the device offers', async () => {
    mockStatus({ biometry: 'touchId' });

    render(<AppLockSettings />, { wrapper: TestProviders });

    expect(await screen.findByText(/require touch id/i)).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'App lock' }),
    ).not.toBeChecked();
  });

  it('turns the lock on once the user has authenticated', async () => {
    mockStatus();
    vi.mocked(setAppLockEnabled).mockResolvedValue({
      isAvailable: true,
      isEnabled: true,
      biometry: 'faceId',
    });

    render(<AppLockSettings />, { wrapper: TestProviders });
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'App lock' }),
    );

    expect(setAppLockEnabled).toHaveBeenCalledWith(true, 'Turn on app lock');
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'App lock' })).toBeChecked(),
    );
  });

  it('leaves the lock off when authentication is cancelled', async () => {
    mockStatus();
    vi.mocked(setAppLockEnabled).mockResolvedValue({
      isAvailable: true,
      isEnabled: false,
      biometry: 'faceId',
    });

    render(<AppLockSettings />, { wrapper: TestProviders });
    const checkbox = await screen.findByRole('checkbox', { name: 'App lock' });
    await userEvent.click(checkbox);

    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(checkbox).not.toBeChecked();
  });

  it('cannot be turned on when the device has no passcode', async () => {
    mockStatus({ isAvailable: false, biometry: 'none' });

    render(<AppLockSettings />, { wrapper: TestProviders });

    expect(
      await screen.findByRole('checkbox', { name: 'App lock' }),
    ).toBeDisabled();
    expect(
      screen.getByText(/set a passcode on this device/i),
    ).toBeInTheDocument();
  });
});
