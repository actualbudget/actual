import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { AuthSettings } from './AuthSettings';

import {
  useLoginMethod,
  useMultiuserEnabled,
} from '@desktop-client/components/ServerContext';
import { useSyncServerStatus } from '@desktop-client/hooks/useSyncServerStatus';
import { TestProvider } from '@desktop-client/redux/mock';

vi.mock('@desktop-client/hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));
vi.mock('@desktop-client/components/ServerContext', () => ({
  useMultiuserEnabled: vi.fn(),
  useLoginMethod: vi.fn(),
}));

describe('AuthSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when server status is no-server', () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('no-server');
    vi.mocked(useMultiuserEnabled).mockReturnValue(false);
    vi.mocked(useLoginMethod).mockReturnValue('password');

    const { container } = render(<AuthSettings />, { wrapper: TestProvider });

    expect(container.firstChild).toBeNull();
  });

  describe('when server is offline', () => {
    beforeEach(() => {
      vi.mocked(useSyncServerStatus).mockReturnValue('offline');
    });

    it('disables buttons and shows warning when login method is password', () => {
      vi.mocked(useMultiuserEnabled).mockReturnValue(false);
      vi.mocked(useLoginMethod).mockReturnValue('password');

      render(<AuthSettings />, { wrapper: TestProvider });

      const startUsingButton = screen.getByRole('button', {
        name: /start using openid/i,
      });
      expect(startUsingButton).toBeDisabled();

      const warningText = screen.getByText(
        /server is offline\. openid settings are unavailable\./i,
      );
      expect(warningText).toBeInTheDocument();
    });

    it('disables buttons and shows warning when login method is openid', () => {
      vi.mocked(useMultiuserEnabled).mockReturnValue(false);
      vi.mocked(useLoginMethod).mockReturnValue('openid');

      render(<AuthSettings />, { wrapper: TestProvider });

      const disableButton = screen.getByRole('button', {
        name: /disable openid/i,
      });
      expect(disableButton).toBeDisabled();

      const warningText = screen.getByText(
        /server is offline\. openid settings are unavailable\./i,
      );
      expect(warningText).toBeInTheDocument();
    });
  });

  describe('when server is online', () => {
    beforeEach(() => {
      vi.mocked(useSyncServerStatus).mockReturnValue('online');
    });

    it('renders normally with password login method', () => {
      vi.mocked(useMultiuserEnabled).mockReturnValue(false);
      vi.mocked(useLoginMethod).mockReturnValue('password');

      render(<AuthSettings />, { wrapper: TestProvider });

      const startUsingButton = screen.getByRole('button', {
        name: /start using openid/i,
      });
      expect(startUsingButton).not.toBeDisabled();

      const warningText = screen.queryByText(
        /server is offline\. openid settings are unavailable\./i,
      );
      expect(warningText).not.toBeInTheDocument();
    });

    it('renders normally with openid login method', () => {
      vi.mocked(useMultiuserEnabled).mockReturnValue(false);
      vi.mocked(useLoginMethod).mockReturnValue('openid');

      render(<AuthSettings />, { wrapper: TestProvider });

      const disableButton = screen.getByRole('button', {
        name: /disable openid/i,
      });
      expect(disableButton).not.toBeDisabled();

      const warningText = screen.queryByText(
        /server is offline\. openid settings are unavailable\./i,
      );
      expect(warningText).not.toBeInTheDocument();
    });

    it('shows multi-user warning when multiuser is enabled', () => {
      vi.mocked(useMultiuserEnabled).mockReturnValue(true);
      vi.mocked(useLoginMethod).mockReturnValue('openid');

      render(<AuthSettings />, { wrapper: TestProvider });

      const warningText = screen.getByText(
        /disabling openid will deactivate multi-user mode\./i,
      );
      expect(warningText).toBeInTheDocument();
    });
  });
});
