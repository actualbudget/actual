import { HotkeysProvider } from 'react-hotkeys-hook';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTestAppStore, TestProviders } from '#mocks';
import { pushModal } from '#modals/modalsSlice';

import { ConfirmTransactionEditModal } from './ConfirmTransactionEditModal';

function setup() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const store = createTestAppStore();
  const options = {
    confirmReason: 'editReconciled' as const,
    onConfirm,
    onCancel,
  };
  store.dispatch(
    pushModal({ modal: { name: 'confirm-transaction-edit', options } }),
  );
  render(
    <TestProviders store={store}>
      <HotkeysProvider>
        <ConfirmTransactionEditModal {...options} />
      </HotkeysProvider>
    </TestProviders>,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmTransactionEditModal', () => {
  it('cancels once when dismissed with the close button', async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels once from Cancel', async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('confirms without cancelling', async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
