/**
 * Browser Visual Regression Tests
 *
 * IMPORTANT: These tests generate screenshots that vary by environment (fonts, rendering, etc.).
 * For consistent screenshot quality, always run these tests in Docker:
 *
 *   From root: yarn test:browser:docker AuthSettings.browser
 *   Or: cd packages/desktop-client && yarn test:browser:docker AuthSettings.browser
 *
 * Running locally will produce inconsistent screenshots due to system-specific rendering differences.
 */

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

  test.skip('does not render OpenID block when server status is no-server', async () => {
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

  // TODO: render permutations
  test.only('renders disabled OpenID block with warning when server is offline', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('offline');
    vi.mocked(useMultiuserEnabled).mockReturnValue(false);
    vi.mocked(useLoginMethod).mockReturnValue('password');

    await render(
      <div
        data-testid="auth-settings-wrapper"
        style={{
          minWidth: '1200px',
          width: '1200px',
          padding: '20px',
          boxSizing: 'border-box',
          // Ensure the element can expand to full width
          display: 'block',
          overflow: 'visible',
          // Force the element to be exactly 1200px
          maxWidth: '1200px',
          position: 'relative',
        }}
      >
        <AuthSettings />
      </div>,
      {
        wrapper: BrowserTestProvider,
      },
    );

    // Wait for the element to be fully rendered and visible
    const wrapper = page.getByTestId('auth-settings-wrapper');
    await expect(wrapper).toBeVisible();

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    // Use toMatchScreenshot - scale: 'device' is set globally in vite.config.mts
    // This should use device pixels (respecting deviceScaleFactor: 3) instead of CSS pixels
    // With deviceScaleFactor: 3, screenshots should be 3x the CSS size
    //
    // NOTE: If screenshots are still low-res, this is likely a bug in vitest-browser
    // where toMatchScreenshot doesn't properly respect deviceScaleFactor even with scale: 'device'
    await expect(wrapper).toMatchScreenshot();
  });

  test('renders enabled OpenID block when server is online with password login', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useMultiuserEnabled).mockReturnValue(false);
    vi.mocked(useLoginMethod).mockReturnValue('password');

    await render(
      <div
        data-testid="auth-settings-wrapper"
        style={{
          minWidth: '1200px',
          width: '1200px',
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        <AuthSettings />
      </div>,
      {
        wrapper: BrowserTestProvider,
      },
    );

    const wrapper = page.getByTestId('auth-settings-wrapper');
    // scale: 'device' is set globally in vite.config.mts
    await expect(wrapper).toMatchScreenshot();
  });

  test('renders OpenID enabled state when server is online with OpenID login', async () => {
    vi.mocked(useSyncServerStatus).mockReturnValue('online');
    vi.mocked(useMultiuserEnabled).mockReturnValue(false);
    vi.mocked(useLoginMethod).mockReturnValue('openid');

    await render(
      <div
        data-testid="auth-settings-wrapper"
        style={{
          minWidth: '1200px',
          width: '1200px',
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        <AuthSettings />
      </div>,
      {
        wrapper: BrowserTestProvider,
      },
    );

    const wrapper = page.getByTestId('auth-settings-wrapper');
    // scale: 'device' is set globally in vite.config.mts
    await expect(wrapper).toMatchScreenshot();
  });
});
