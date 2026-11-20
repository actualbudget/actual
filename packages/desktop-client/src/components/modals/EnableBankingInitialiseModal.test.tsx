import { send } from '@actual-app/core/platform/client/connection';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

import { EnableBankingInitialiseModal } from './EnableBankingInitialiseModal';

vi.mock('#auth/AuthProvider', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  listen: vi.fn(),
  unlisten: vi.fn(),
}));

it('stays open and shows the reason when the server rejects the credentials', async () => {
  vi.mocked(send).mockResolvedValueOnce({
    error_code: 'CONFIGURATION_FAILED',
    error_type: 'Application does not exist',
  });
  const onSuccess = vi.fn();
  render(
    <TestProviders>
      <EnableBankingInitialiseModal onSuccess={onSuccess} />
    </TestProviders>,
  );

  fireEvent.change(screen.getByLabelText('Application ID:'), {
    target: { value: 'unknown-application' },
  });
  fireEvent.change(screen.getByLabelText('Secret Key (.pem file):'), {
    target: { files: [new File(['key'], 'key.pem')] },
  });
  await screen.findByText('key.pem');
  fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

  expect(
    await screen.findByText('Application does not exist'),
  ).toBeInTheDocument();
  expect(onSuccess).not.toHaveBeenCalled();
});
