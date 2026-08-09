import { initServer } from '@actual-app/core/platform/client/connection';
import {
  browserSupportsWebAuthn,
  startRegistration,
} from '@simplewebauthn/browser';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Bootstrap } from './Bootstrap';
import type * as CommonModule from './common';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  browserSupportsWebAuthn: vi.fn(() => true),
}));

const mockDispatch = vi.fn();
vi.mock('#redux', () => ({
  useDispatch: () => mockDispatch,
}));

const mockNavigate = vi.fn();
vi.mock('#hooks/useNavigate', () => ({
  useNavigate: () => mockNavigate,
}));

const mockRefreshLoginMethods = vi.fn();
vi.mock('#components/ServerContext', () => ({
  useRefreshLoginMethods: () => mockRefreshLoginMethods,
}));

vi.mock('./common', async importOriginal => {
  const actual = await importOriginal<typeof CommonModule>();
  return {
    ...actual,
    useBootstrapped: () => ({ checked: true }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(browserSupportsWebAuthn).mockReturnValue(true);
  initServer({});
});

describe('Bootstrap - method choice', () => {
  it('shows password and passkey options before a method is chosen', () => {
    render(<Bootstrap />);

    expect(
      screen.getByRole('button', { name: 'Use a password' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Register a passkey' }),
    ).toBeVisible();
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();
  });

  it('shows the password form after choosing "Use a password"', async () => {
    const user = userEvent.setup();
    render(<Bootstrap />);

    await user.click(screen.getByRole('button', { name: 'Use a password' }));

    expect(screen.getByPlaceholderText('Password')).toBeVisible();
  });

  it('disables the passkey option when the browser does not support WebAuthn', async () => {
    vi.mocked(browserSupportsWebAuthn).mockReturnValue(false);

    render(<Bootstrap />);

    expect(
      await screen.findByRole('button', { name: 'Register a passkey' }),
    ).toBeDisabled();
  });

  it('registers a passkey and navigates to /login on success', async () => {
    const user = userEvent.setup();
    initServer({
      'webauthn-get-registration-options': vi.fn().mockResolvedValue({
        options: { challenge: 'reg-challenge' },
      }),
      'webauthn-verify-registration': vi.fn().mockResolvedValue({}),
    });
    vi.mocked(startRegistration).mockResolvedValue({
      id: 'cred',
      response: {},
    } as never);

    render(<Bootstrap />);
    await user.click(
      screen.getByRole('button', { name: 'Register a passkey' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Register a passkey' }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
    expect(mockRefreshLoginMethods).toHaveBeenCalled();
  });

  it('shows an error when passkey registration verification fails', async () => {
    const user = userEvent.setup();
    initServer({
      'webauthn-get-registration-options': vi.fn().mockResolvedValue({
        options: { challenge: 'reg-challenge' },
      }),
      'webauthn-verify-registration': vi.fn().mockResolvedValue({
        error: 'verification-failed',
      }),
    });
    vi.mocked(startRegistration).mockResolvedValue({
      id: 'cred',
      response: {},
    } as never);

    render(<Bootstrap />);
    await user.click(
      screen.getByRole('button', { name: 'Register a passkey' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Register a passkey' }),
    );

    expect(
      await screen.findByText(
        'Your passkey could not be registered. Please try again',
      ),
    ).toBeVisible();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
