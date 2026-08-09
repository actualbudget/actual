import { initServer } from '@actual-app/core/platform/client/connection';
import { startAuthentication } from '@simplewebauthn/browser';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as CommonModule from './common';
import { Login } from './Login';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: vi.fn(),
}));

const mockDispatch = vi.fn();
vi.mock('#redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('#components/ServerContext', () => ({
  useLoginMethod: () => 'webauthn',
  useAvailableLoginMethods: () => [
    { method: 'webauthn', displayName: 'Passkey', active: true },
  ],
}));

vi.mock('./common', async importOriginal => {
  const actual = await importOriginal<typeof CommonModule>();
  return {
    ...actual,
    useBootstrapped: () => ({ checked: true }),
  };
});

vi.mock('react-router', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  initServer({});
});

describe('Login - WebAuthn method', () => {
  it('renders a passkey sign-in button', () => {
    render(<Login />);

    expect(
      screen.getByRole('button', { name: 'Sign in with passkey' }),
    ).toBeVisible();
  });

  it('signs in successfully via the passkey ceremony', async () => {
    const user = userEvent.setup();
    const options = { challenge: 'auth-challenge' };
    const assertion = { id: 'cred', response: {} };

    initServer({
      'webauthn-get-authentication-options': vi.fn().mockResolvedValue({
        options,
      }),
      'webauthn-verify-authentication': vi.fn().mockResolvedValue({}),
    });
    vi.mocked(startAuthentication).mockResolvedValue(assertion as never);

    render(<Login />);
    await user.click(
      screen.getByRole('button', { name: 'Sign in with passkey' }),
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
    expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: options });
  });

  it('shows an error when no passkey is registered', async () => {
    const user = userEvent.setup();
    initServer({
      'webauthn-get-authentication-options': vi.fn().mockResolvedValue({
        error: 'webauthn-not-configured',
      }),
    });

    render(<Login />);
    await user.click(
      screen.getByRole('button', { name: 'Sign in with passkey' }),
    );

    expect(
      await screen.findByText('No passkey has been registered for this server'),
    ).toBeVisible();
    expect(startAuthentication).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('shows an error when the browser ceremony is cancelled', async () => {
    const user = userEvent.setup();
    initServer({
      'webauthn-get-authentication-options': vi.fn().mockResolvedValue({
        options: { challenge: 'auth-challenge' },
      }),
    });
    vi.mocked(startAuthentication).mockRejectedValue(
      new Error('NotAllowedError'),
    );

    render(<Login />);
    await user.click(
      screen.getByRole('button', { name: 'Sign in with passkey' }),
    );

    expect(
      await screen.findByText(
        'Your passkey could not be verified. Please try again',
      ),
    ).toBeVisible();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('shows an error when the server rejects the assertion', async () => {
    const user = userEvent.setup();
    initServer({
      'webauthn-get-authentication-options': vi.fn().mockResolvedValue({
        options: { challenge: 'auth-challenge' },
      }),
      'webauthn-verify-authentication': vi.fn().mockResolvedValue({
        error: 'verification-failed',
      }),
    });
    vi.mocked(startAuthentication).mockResolvedValue({
      id: 'cred',
      response: {},
    } as never);

    render(<Login />);
    await user.click(
      screen.getByRole('button', { name: 'Sign in with passkey' }),
    );

    expect(
      await screen.findByText(
        'Your passkey could not be verified. Please try again',
      ),
    ).toBeVisible();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
