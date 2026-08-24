import { send } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { useLoginMethod, useTotpSupported } from '#components/ServerContext';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { TestProviders } from '#mocks';

import { TotpSettings } from './TotpSettings';

vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));
vi.mock('#components/ServerContext', () => ({
  useLoginMethod: vi.fn(),
  useTotpSupported: vi.fn(),
}));
vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

describe('TotpSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(send).mockResolvedValue({ enabled: false, pending: false });
    vi.mocked(useTotpSupported).mockReturnValue(true);
  });

  it('does not render against a server without two-factor support', () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useLoginMethod).mockReturnValue('password');
    vi.mocked(useTotpSupported).mockReturnValue(false);

    const { container } = render(<TotpSettings />, { wrapper: TestProviders });

    expect(container.firstChild).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('does not render when there is no server', () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('no-server');
    vi.mocked(useLoginMethod).mockReturnValue('password');

    const { container } = render(<TotpSettings />, { wrapper: TestProviders });

    expect(container.firstChild).toBeNull();
  });

  it('does not render when OpenID is the login method', () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useLoginMethod).mockReturnValue('openid');

    const { container } = render(<TotpSettings />, { wrapper: TestProviders });

    expect(container.firstChild).toBeNull();
  });

  it('offers to enable two-factor authentication when disabled', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useLoginMethod).mockReturnValue('password');

    render(<TotpSettings />, { wrapper: TestProviders });

    const button = await screen.findByRole('button', {
      name: /enable two-factor authentication/i,
    });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('offers to disable it when already enabled', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useLoginMethod).mockReturnValue('password');
    vi.mocked(send).mockResolvedValue({ enabled: true, pending: false });

    render(<TotpSettings />, { wrapper: TestProviders });

    expect(
      await screen.findByRole('button', {
        name: /disable two-factor authentication/i,
      }),
    ).toBeInTheDocument();
  });

  it('disables the button and warns when the server is offline', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('offline');
    vi.mocked(useLoginMethod).mockReturnValue('password');

    render(<TotpSettings />, { wrapper: TestProviders });

    expect(
      await screen.findByRole('button', {
        name: /enable two-factor authentication/i,
      }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        /server is offline\. two-factor settings are unavailable\./i,
      ),
    ).toBeInTheDocument();
  });
});
