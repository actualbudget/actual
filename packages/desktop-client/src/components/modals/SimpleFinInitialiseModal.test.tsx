import { send } from '@actual-app/core/platform/client/connection';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

import { SimpleFinInitialiseModal } from './SimpleFinInitialiseModal';

vi.mock('#hooks/useCurrentAccess', () => ({
  useCurrentAccess: () => ({ cloudFileId: 'budget-a', isAdmin: true }),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  listen: vi.fn(),
  unlisten: vi.fn(),
}));

async function switchToGlobal() {
  const onSuccess = vi.fn();
  render(
    <TestProviders>
      <SimpleFinInitialiseModal
        credentialSource="per-budget-file"
        onSuccess={onSuccess}
      />
    </TestProviders>,
  );
  fireEvent.click(screen.getByLabelText('For this budget only'));
  fireEvent.change(screen.getByLabelText('Token:'), {
    target: { value: 'new-global-token' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
  return onSuccess;
}

beforeEach(() => {
  vi.mocked(send).mockReset();
});

it('removes both budget credentials before reporting a successful global switch', async () => {
  const onSuccess = await switchToGlobal();
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(false));
  expect(vi.mocked(send).mock.calls).toEqual([
    [
      'secret-set',
      { name: 'simplefin_token', value: 'new-global-token', fileId: null },
    ],
    ['secret-set', { name: 'simplefin_accessKey', value: null, fileId: null }],
    [
      'secret-set',
      { name: 'simplefin_token', value: null, fileId: 'budget-a' },
    ],
    [
      'secret-set',
      { name: 'simplefin_accessKey', value: null, fileId: 'budget-a' },
    ],
  ]);
});

it.each([3, 4])(
  'does not report success when cleanup request %s fails',
  async failedCall => {
    for (let call = 1; call < failedCall; call++) {
      vi.mocked(send).mockResolvedValueOnce(undefined);
    }
    vi.mocked(send).mockResolvedValueOnce({ error: 'internal' });
    const onSuccess = await switchToGlobal();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save and continue' }),
      ).toBeEnabled(),
    );
    expect(send).toHaveBeenCalledTimes(failedCall);
    expect(onSuccess).not.toHaveBeenCalled();
  },
);
