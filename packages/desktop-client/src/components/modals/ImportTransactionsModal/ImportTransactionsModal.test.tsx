import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

const ORIGINAL_FILE = '/tmp/original.csv';
const SELECTED_FILE = '/tmp/selected.csv';

const parseCalls: string[] = [];
const parseErrors: Array<Array<{ message: string }>> = [];

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: async (name: string, args?: { filepath?: string }) => {
    if (name === 'transactions-parse-file') {
      parseCalls.push(args?.filepath ?? '');
      return { errors: parseErrors.shift() ?? [], transactions: [] };
    }
    return {};
  },
}));

const { ImportTransactionsModal } = await import('./ImportTransactionsModal');

function renderModal() {
  return render(
    <TestProviders>
      <ImportTransactionsModal
        filename={ORIGINAL_FILE}
        accountId="account-1"
        onImported={vi.fn()}
      />
    </TestProviders>,
  );
}

describe('ImportTransactionsModal', () => {
  beforeEach(() => {
    parseCalls.length = 0;
    parseErrors.length = 0;
    // The "Select new file..." button only shows once a parse has failed, which is
    // how a user reaches another file without closing the modal.
    Object.defineProperty(window, 'Actual', {
      value: { openFileDialog: vi.fn(async () => [SELECTED_FILE]) },
      writable: true,
      configurable: true,
    });
  });

  it('re-parses the selected file, not the original, when an option changes', async () => {
    const user = userEvent.setup();
    parseErrors.push([{ message: 'could not parse' }]);

    renderModal();

    await waitFor(() => expect(parseCalls).toEqual([ORIGINAL_FILE]));

    await user.click(
      await screen.findByRole('button', { name: 'Select new file...' }),
    );

    await waitFor(() =>
      expect(parseCalls).toEqual([ORIGINAL_FILE, SELECTED_FILE]),
    );

    await user.click(await screen.findByText('File has header row'));

    await waitFor(() => expect(parseCalls).toHaveLength(3));
    expect(parseCalls[2]).toBe(SELECTED_FILE);
  });

  it('re-parses when the same file is picked again after a failure', async () => {
    // The "Select new file..." button only appears once a parse has failed, so re-picking the
    // same path after fixing the file is the likely action, not an edge case.
    const user = userEvent.setup();
    parseErrors.push([{ message: 'could not parse' }]);
    (
      window.Actual.openFileDialog as ReturnType<typeof vi.fn>
    ).mockResolvedValue([ORIGINAL_FILE]);

    renderModal();

    await waitFor(() => expect(parseCalls).toEqual([ORIGINAL_FILE]));

    await user.click(
      await screen.findByRole('button', { name: 'Select new file...' }),
    );

    await waitFor(() =>
      expect(parseCalls).toEqual([ORIGINAL_FILE, ORIGINAL_FILE]),
    );
  });

  it('parses a newly selected file exactly once', async () => {
    const user = userEvent.setup();
    parseErrors.push([{ message: 'could not parse' }]);

    renderModal();

    await waitFor(() => expect(parseCalls).toEqual([ORIGINAL_FILE]));

    await user.click(
      await screen.findByRole('button', { name: 'Select new file...' }),
    );

    await waitFor(() =>
      expect(parseCalls).toEqual([ORIGINAL_FILE, SELECTED_FILE]),
    );
    // Give a second parse a chance to land before asserting there is not one
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(parseCalls).toEqual([ORIGINAL_FILE, SELECTED_FILE]);
  });
});
