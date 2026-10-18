import React, { StrictMode } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { FinTSAuthModal } from './FinTSAuthModal';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  listen: vi.fn(() => vi.fn()),
}));

const cancelCalls = () =>
  vi
    .mocked(send)
    .mock.calls.filter(
      ([name, args]) =>
        name === 'fints-auth' &&
        (args as { cancel?: boolean } | undefined)?.cancel === true,
    );

function renderModal(onComplete: (isReady: boolean) => void) {
  return render(
    <StrictMode>
      <TestProviders>
        <FinTSAuthModal connectionId="c1" onComplete={onComplete} />
      </TestProviders>
    </StrictMode>,
  );
}

describe('FinTSAuthModal', () => {
  beforeEach(async () => {
    // Let the deferred cancellation of the previous test's modal, which the
    // automatic cleanup unmounted, happen before the calls are reset.
    await new Promise(resolve => setTimeout(resolve, 10));
    vi.mocked(send).mockReset();
    vi.mocked(send).mockResolvedValue({
      state: 'pin-required',
      rejected: false,
    });
  });

  it('stays open in strict mode, which remounts it once', async () => {
    const onComplete = vi.fn();
    renderModal(onComplete);

    expect(await screen.findByLabelText('PIN:')).toBeInTheDocument();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onComplete).not.toHaveBeenCalled();
    expect(cancelCalls()).toHaveLength(0);
  });

  it('reports a cancellation when it disappears without being closed', async () => {
    const onComplete = vi.fn();
    const { unmount } = renderModal(onComplete);
    await screen.findByLabelText('PIN:');

    // What navigating to another page does: all modals are removed.
    unmount();

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(false));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(cancelCalls()).toHaveLength(1);
  });

  it('reports the cancellation only once when closed and then removed', async () => {
    const onComplete = vi.fn();
    const { unmount } = renderModal(onComplete);
    await screen.findByLabelText('PIN:');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    unmount();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(false);
    expect(cancelCalls()).toHaveLength(1);
  });
});
