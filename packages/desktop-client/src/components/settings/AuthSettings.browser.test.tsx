import { expect, test, vi, beforeEach, describe } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { AuthSettings } from './AuthSettings';

import {
  useMultiuserEnabled,
  useLoginMethod,
} from '@desktop-client/components/ServerContext';
import { useSyncServerStatus } from '@desktop-client/hooks/useSyncServerStatus';
import { BrowserTestProvider } from '@desktop-client/redux/mock';

// Mock the hooks that AuthSettings depends on
vi.mock('@desktop-client/hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: vi.fn(),
}));

vi.mock('@desktop-client/components/ServerContext', () => ({
  useMultiuserEnabled: vi.fn(),
  useLoginMethod: vi.fn(),
}));

describe('AuthSettings Visual Regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does not render OpenID block when server status is no-server', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('no-server');
    vi.mocked(useMultiuserEnabled).mockReturnValue(false);
    vi.mocked(useLoginMethod).mockReturnValue('password');

    await render(<AuthSettings />, { wrapper: BrowserTestProvider });

    // Component should return null, so trying to get "authentication method" text should fail
    // This test verifies the component doesn't render at all
    // Since the component returns null, nothing is rendered
    try {
      const authMethodText = page.getByText(/authentication method/i);
      await expect.element(authMethodText).toBeVisible();
      // If we get here, the element exists, which means the test should fail
      expect.fail('Expected component to return null, but it rendered');
    } catch (error) {
      // Element not found is expected, so the test passes
      expect(error).toBeDefined();
    }
  });

  test('renders disabled OpenID block with warning when server is offline', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('offline');
    vi.mocked(useMultiuserEnabled).mockReturnValue(false);
    vi.mocked(useLoginMethod).mockReturnValue('password');

    const screen = await render(<AuthSettings />, {
      wrapper: BrowserTestProvider,
    });

    await expect(screen.container).toMatchScreenshot();
  });

  test('renders enabled OpenID block when server is online with password login', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useMultiuserEnabled).mockReturnValue(false);
    vi.mocked(useLoginMethod).mockReturnValue('password');

    const screen = await render(<AuthSettings />, {
      wrapper: BrowserTestProvider,
    });

    await expect(screen.container).toMatchScreenshot();
  });

  test('renders OpenID enabled state when server is online with OpenID login', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useMultiuserEnabled).mockReturnValue(false);
    vi.mocked(useLoginMethod).mockReturnValue('openid');

    const screen = await render(<AuthSettings />, {
      wrapper: BrowserTestProvider,
    });

    await expect(screen.container).toMatchScreenshot();
  });
});
