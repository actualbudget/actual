import { send } from '@actual-app/core/platform/client/connection';
import type { ParseFileOptions } from '@actual-app/core/server/transactions/import/parse-file';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import {
  ImportTransactionsModal,
  shouldPreserveImportSettingsForParse,
} from './ImportTransactionsModal';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

const mockPrefs = {};
vi.mock('#hooks/useSyncedPrefs', () => ({
  useSyncedPrefs: () => [mockPrefs, vi.fn()],
}));

const mockCategories = { data: { list: [] } };
vi.mock('#hooks/useCategories', () => ({
  useCategories: () => mockCategories,
}));

vi.mock('#hooks/useDateFormat', () => ({
  useDateFormat: () => 'MM/dd/yyyy',
}));

vi.mock('#accounts', () => ({
  useImportPreviewTransactionsMutation: () => ({
    mutate: vi.fn((_args, { onSuccess }) => onSuccess?.([])),
    mutateAsync: vi.fn().mockResolvedValue({ added: [], updated: [] }),
  }),
  useImportTransactionsMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('#payees', () => ({
  payeeQueries: {
    all: () => ({
      queryKey: ['payees'],
      queryFn: vi.fn().mockResolvedValue([]),
    }),
  },
}));

describe('ImportTransactionsModal', () => {
  const mockOpenFileDialog = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.Actual = {
      ...window.Actual,
      openFileDialog: mockOpenFileDialog,
    };
  });

  it('uses the selected file for option-driven re-parses and performs only one parse on file selection', async () => {
    vi.mocked(send).mockResolvedValueOnce({
      errors: [{ message: 'Bad file format' }],
      transactions: [],
    });

    render(
      <TestProviders>
        <ImportTransactionsModal
          filename="initial.csv"
          accountId="acc1"
          onImported={vi.fn()}
        />
      </TestProviders>,
    );

    await waitFor(() => {
      expect(send).toHaveBeenCalledWith(
        'transactions-parse-file',
        expect.objectContaining({ filepath: 'initial.csv' }),
      );
    });
    expect(send).toHaveBeenCalledTimes(1);

    vi.mocked(send).mockResolvedValue({
      errors: [],
      transactions: [{ Date: '2026-01-01', Payee: 'Store', Amount: '10.00' }],
    });

    mockOpenFileDialog.mockResolvedValueOnce(['new-file.csv']);
    const selectNewButton = await screen.findByRole('button', {
      name: /select new file/i,
    });
    await userEvent.click(selectNewButton);

    await waitFor(() => {
      expect(send).toHaveBeenLastCalledWith(
        'transactions-parse-file',
        expect.objectContaining({ filepath: 'new-file.csv' }),
      );
    });
    expect(send).toHaveBeenCalledTimes(2);

    // Changing skipStartLines re-parses the new file, NOT initial.csv
    const skipStartInput = await screen.findByLabelText(/skip start lines/i);
    fireEvent.change(skipStartInput, { target: { value: '2' } });

    await waitFor(() => {
      expect(send).toHaveBeenLastCalledWith(
        'transactions-parse-file',
        expect.objectContaining({
          filepath: 'new-file.csv',
          options: expect.objectContaining({ skipStartLines: 2 }),
        }),
      );
    });
    expect(send).toHaveBeenCalledTimes(3);

    // Changing skipEndLines re-parses the new file, NOT initial.csv
    const skipEndInput = screen.getByLabelText(/skip end lines/i);
    fireEvent.change(skipEndInput, { target: { value: '1' } });

    await waitFor(() => {
      expect(send).toHaveBeenLastCalledWith(
        'transactions-parse-file',
        expect.objectContaining({
          filepath: 'new-file.csv',
          options: expect.objectContaining({ skipEndLines: 1 }),
        }),
      );
    });
    expect(send).toHaveBeenCalledTimes(4);

    // Toggling header row re-parses the new file as well
    const headerRowToggle = screen.getByLabelText(/file has header row/i);
    fireEvent.click(headerRowToggle);

    await waitFor(() => {
      expect(send).toHaveBeenLastCalledWith(
        'transactions-parse-file',
        expect.objectContaining({
          filepath: 'new-file.csv',
          options: expect.objectContaining({ hasHeaderRow: false }),
        }),
      );
    });
    expect(send).toHaveBeenCalledTimes(5);
  });

  it('re-parses when the user re-selects the same file path after a parse error', async () => {
    vi.mocked(send).mockResolvedValueOnce({
      errors: [{ parsed: true, message: 'Parse error' }],
      transactions: [],
    });

    render(
      <TestProviders>
        <ImportTransactionsModal
          filename="initial.csv"
          accountId="acc1"
          onImported={vi.fn()}
        />
      </TestProviders>,
    );

    const selectNewButton = await screen.findByRole('button', {
      name: /select new file/i,
    });

    await waitFor(() => {
      expect(send).toHaveBeenCalledTimes(1);
    });

    vi.mocked(send).mockResolvedValueOnce({
      errors: [],
      transactions: [{ Date: '2026-01-01', Payee: 'Store', Amount: '10.00' }],
    });

    mockOpenFileDialog.mockResolvedValueOnce(['initial.csv']);
    fireEvent.click(selectNewButton);

    await waitFor(() => {
      expect(send).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenLastCalledWith(
        'transactions-parse-file',
        expect.objectContaining({
          filepath: 'initial.csv',
          options: expect.objectContaining({
            delimiter: ',',
            hasHeaderRow: true,
          }),
        }),
      );
    });
  });

  it('re-parses with non-CSV options when re-selecting the same QIF file after error', async () => {
    vi.mocked(send).mockResolvedValueOnce({
      errors: [{ parsed: true, message: 'Parse error' }],
      transactions: [],
    });

    render(
      <TestProviders>
        <ImportTransactionsModal
          filename="initial.qif"
          accountId="acc1"
          onImported={vi.fn()}
        />
      </TestProviders>,
    );

    const selectNewButton = await screen.findByRole('button', {
      name: /select new file/i,
    });

    await waitFor(() => {
      expect(send).toHaveBeenCalledTimes(1);
    });

    vi.mocked(send).mockResolvedValueOnce({
      errors: [],
      transactions: [{ Date: '2026-01-01', Payee: 'Store', Amount: '10.00' }],
    });

    mockOpenFileDialog.mockResolvedValueOnce(['initial.qif']);
    fireEvent.click(selectNewButton);

    await waitFor(() => {
      expect(send).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenLastCalledWith(
        'transactions-parse-file',
        expect.objectContaining({
          filepath: 'initial.qif',
          options: {
            importNotes: true,
            swapPayeeAndMemo: false,
          },
        }),
      );
    });
  });

  describe('shouldPreserveImportSettingsForParse', () => {
    const baseOptions: ParseFileOptions = {
      delimiter: ',',
      hasHeaderRow: true,
      skipStartLines: 0,
      skipEndLines: 0,
      fallbackMissingPayeeToMemo: false,
      importNotes: true,
    };

    it('returns false when a new file is selected', () => {
      const lastParse = {
        filename: 'file1.csv',
        fileType: 'csv',
        options: baseOptions,
      };

      expect(
        shouldPreserveImportSettingsForParse(
          lastParse,
          'file2.csv',
          'csv',
          baseOptions,
        ),
      ).toBe(false);
    });

    it('returns true when the same file only changes skipEndLines', () => {
      const lastParse = {
        filename: 'file1.csv',
        fileType: 'csv',
        options: baseOptions,
      };

      expect(
        shouldPreserveImportSettingsForParse(lastParse, 'file1.csv', 'csv', {
          ...baseOptions,
          skipEndLines: 2,
        }),
      ).toBe(true);
    });

    it('returns false when other options change on the same file', () => {
      const lastParse = {
        filename: 'file1.csv',
        fileType: 'csv',
        options: baseOptions,
      };

      expect(
        shouldPreserveImportSettingsForParse(lastParse, 'file1.csv', 'csv', {
          ...baseOptions,
          delimiter: ';',
        }),
      ).toBe(false);
    });

    it('returns false for non-csv file types', () => {
      const lastParse = {
        filename: 'file1.qif',
        fileType: 'qif',
        options: baseOptions,
      };

      expect(
        shouldPreserveImportSettingsForParse(lastParse, 'file1.qif', 'qif', {
          ...baseOptions,
          skipEndLines: 1,
        }),
      ).toBe(false);
    });
  });
});
