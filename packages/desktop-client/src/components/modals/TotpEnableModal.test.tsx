import { send } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

import { TotpEnableModal } from './TotpEnableModal';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

// jsdom has no canvas, which qrcode uses to produce a data URL.
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,x') },
}));

const passwordField = () => screen.getByPlaceholderText('Password');
const submitPassword = () => screen.getByRole('button', { name: 'OK' });

function renderModal() {
  return render(
    <TestProviders>
      <TotpEnableModal />
    </TestProviders>,
  );
}

describe('TotpEnableModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks for the password before showing a secret', () => {
    renderModal();

    expect(passwordField()).toBeInTheDocument();
    expect(screen.queryByLabelText('Code:')).not.toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it('reports a wrong password and stays on the password step', async () => {
    vi.mocked(send).mockResolvedValue({ error: 'invalid-password' });
    renderModal();

    await userEvent.type(passwordField(), 'wrong');
    await userEvent.click(submitPassword());

    expect(await screen.findByText('Invalid password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Code:')).not.toBeInTheDocument();
  });

  it('shows the QR code and key once the password is accepted', async () => {
    vi.mocked(send).mockResolvedValue({
      secret: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
      otpauthUrl: 'otpauth://totp/Actual%20Budget:host?secret=ABC',
    });
    renderModal();

    await userEvent.type(passwordField(), 'correct-horse');
    await userEvent.click(submitPassword());

    expect(
      await screen.findByText('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Code:')).toBeInTheDocument();
    expect(send).toHaveBeenCalledWith('totp-enroll', {
      password: 'correct-horse',
    });
  });
});
