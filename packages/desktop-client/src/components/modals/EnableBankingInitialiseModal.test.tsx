import { send } from '@actual-app/core/platform/client/connection';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

import { EnableBankingInitialiseModal } from './EnableBankingInitialiseModal';

const access = vi.hoisted(() => ({
  cloudFileId: 'budget-file',
  isAdmin: true,
  isFileOwner: false,
}));
vi.mock('#hooks/useCurrentAccess', () => ({
  useCurrentAccess: () => access,
}));

afterEach(() => {
  vi.mocked(send).mockReset();
  Object.assign(access, { isAdmin: true, isFileOwner: false });
});

async function fillAndSave() {
  fireEvent.change(screen.getByLabelText('Application ID:'), {
    target: { value: 'application' },
  });
  fireEvent.change(screen.getByLabelText('Secret Key (.pem file):'), {
    target: { files: [new File(['key'], 'key.pem')] },
  });
  await screen.findByText('key.pem');
  fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
}

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
      <EnableBankingInitialiseModal
        onSuccess={onSuccess}
        credentialSource="global"
      />
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

it('saves server-wide credentials for an administrator by default', async () => {
  vi.mocked(send).mockResolvedValueOnce({ configured: true });
  const onSuccess = vi.fn();
  render(
    <TestProviders>
      <EnableBankingInitialiseModal
        onSuccess={onSuccess}
        credentialSource="global"
      />
    </TestProviders>,
  );

  await fillAndSave();

  await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledWith(false));
  expect(send).toHaveBeenCalledWith('enablebanking-configure', {
    applicationId: 'application',
    secretKey: 'key',
    fileId: null,
  });
});

it('saves credentials for the open budget only for a budget owner', async () => {
  Object.assign(access, { isAdmin: false, isFileOwner: true });
  vi.mocked(send).mockResolvedValueOnce({ configured: true });
  const onSuccess = vi.fn();
  render(
    <TestProviders>
      <EnableBankingInitialiseModal
        onSuccess={onSuccess}
        credentialSource="global"
      />
    </TestProviders>,
  );

  expect(screen.getByRole('checkbox')).toBeDisabled();
  await fillAndSave();

  await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledWith(true));
  expect(send).toHaveBeenCalledWith('enablebanking-configure', {
    applicationId: 'application',
    secretKey: 'key',
    fileId: 'budget-file',
  });
});
