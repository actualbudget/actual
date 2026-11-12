import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { useSyncedPref } from '#hooks/useSyncedPref';
import { TestProviders } from '#mocks';

import { BankSyncCheckboxOptions } from './BankSyncCheckboxOptions';
import { useBankSyncAccountSettings } from './useBankSyncAccountSettings';

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: vi.fn(),
}));

vi.mock('#hooks/useTransactions', () => ({
  useTransactions: () => ({ transactions: [] }),
}));

/** Stands in for the synced prefs stored in the budget file. */
let prefs: Record<string, string | undefined> = {};

function mockPrefs(initial: Record<string, string>) {
  prefs = { ...initial };
  vi.mocked(useSyncedPref).mockImplementation(key => [
    prefs[key],
    value => {
      prefs[key] = value;
    },
  ]);
}

const setReverseAmounts = vi.fn();

function renderOptions({ reverseAmounts = false } = {}) {
  render(
    <TestProviders>
      <BankSyncCheckboxOptions
        importPending
        setImportPending={vi.fn()}
        importNotes
        setImportNotes={vi.fn()}
        reimportDeleted
        setReimportDeleted={vi.fn()}
        importTransactions
        setImportTransactions={vi.fn()}
        updateDates={false}
        setUpdateDates={vi.fn()}
        reverseAmounts={reverseAmounts}
        setReverseAmounts={setReverseAmounts}
      />
    </TestProviders>,
  );
}

const reverseAmountsOption = () =>
  screen.queryByLabelText(/Reverse transaction amounts/);

describe('BankSyncCheckboxOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides the reverse amounts option when the experimental feature is disabled', () => {
    mockPrefs({});
    renderOptions();

    expect(reverseAmountsOption()).not.toBeInTheDocument();
  });

  it('shows the reverse amounts option when the experimental feature is enabled', async () => {
    mockPrefs({ 'flags.bankSyncReverseAmounts': 'true' });
    renderOptions();

    expect(reverseAmountsOption()).not.toBeChecked();

    await userEvent.click(reverseAmountsOption()!);

    expect(setReverseAmounts).toHaveBeenCalledWith(true);
  });

  it('reflects the saved value of the option', () => {
    mockPrefs({ 'flags.bankSyncReverseAmounts': 'true' });
    renderOptions({ reverseAmounts: true });

    expect(reverseAmountsOption()).toBeChecked();
  });
});

describe('useBankSyncAccountSettings reverse amounts', () => {
  it('persists the option per account', () => {
    mockPrefs({});
    const { result } = renderHook(() => useBankSyncAccountSettings('acct-1'));

    expect(result.current.reverseAmounts).toBe(false);

    act(() => result.current.setReverseAmounts(true));
    act(() => result.current.saveSettings());

    expect(prefs['sync-reverse-amounts-acct-1']).toBe('true');
    expect(prefs['sync-reverse-amounts-acct-2']).toBeUndefined();

    // Reopening the settings, e.g. after a restart, reads the saved value.
    const { result: reopened } = renderHook(() =>
      useBankSyncAccountSettings('acct-1'),
    );
    expect(reopened.current.reverseAmounts).toBe(true);

    const { result: otherAccount } = renderHook(() =>
      useBankSyncAccountSettings('acct-2'),
    );
    expect(otherAccount.current.reverseAmounts).toBe(false);
  });

  it('does not write the option for accounts where it was never changed', () => {
    mockPrefs({});
    const { result } = renderHook(() => useBankSyncAccountSettings('acct-1'));

    act(() => result.current.saveSettings());

    expect(prefs).not.toHaveProperty('sync-reverse-amounts-acct-1');
    expect(prefs['sync-update-dates-acct-1']).toBe('false');
  });
});
