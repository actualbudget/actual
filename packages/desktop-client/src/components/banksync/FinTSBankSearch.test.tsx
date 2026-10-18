import React, { useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { FinTSBank } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { FinTSBankSearch } from './FinTSBankSearch';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  listen: vi.fn(() => vi.fn()),
}));

const BANKS: FinTSBank[] = [
  {
    blz: '70150000',
    name: 'Stadtsparkasse München',
    city: 'München',
    url: 'https://s.example/fints',
  },
  {
    blz: '74051230',
    name: 'Sparkasse Freyung-Grafenau',
    city: 'Freyung-Grafenau',
    url: 'https://f.example/fints',
  },
];

function Harness({
  onSelectBank,
}: {
  onSelectBank: (bank: FinTSBank) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <TestProviders>
      <FinTSBankSearch
        id="bank"
        value={value}
        onChangeValue={setValue}
        onSelectBank={bank => {
          setValue(bank.blz);
          onSelectBank(bank);
        }}
      />
    </TestProviders>
  );
}

describe('FinTSBankSearch', () => {
  beforeEach(() => {
    vi.mocked(send).mockReset();
    vi.mocked(send).mockResolvedValue({ banks: BANKS });
  });

  it('suggests banks while typing a name', async () => {
    render(<Harness onSelectBank={vi.fn()} />);

    await userEvent.type(screen.getByRole('combobox'), 'sparkasse');

    expect(
      await screen.findByRole('option', { name: /Stadtsparkasse München/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /74051230/ }),
    ).toBeInTheDocument();
    expect(send).toHaveBeenLastCalledWith('fints-bank-search', {
      query: 'sparkasse',
    });
  });

  it('does not search before two characters', async () => {
    render(<Harness onSelectBank={vi.fn()} />);

    await userEvent.type(screen.getByRole('combobox'), 's');
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(send).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects a suggestion with the keyboard', async () => {
    const onSelectBank = vi.fn();
    render(<Harness onSelectBank={onSelectBank} />);
    const input = screen.getByRole('combobox');

    await userEvent.type(input, '7405');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelectBank).toHaveBeenCalledWith(BANKS[1]);
    expect(input).toHaveValue('74051230');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects a suggestion with the mouse', async () => {
    const onSelectBank = vi.fn();
    render(<Harness onSelectBank={onSelectBank} />);

    await userEvent.type(screen.getByRole('combobox'), 'münchen');
    await userEvent.click(
      await screen.findByRole('option', { name: /Stadtsparkasse München/ }),
    );

    expect(onSelectBank).toHaveBeenCalledWith(BANKS[0]);
  });

  it('closes only the suggestions on Escape', async () => {
    // Stands in for the dialog around the field, which must not see the key.
    const onDialogKeyDown = vi.fn();
    document.addEventListener('keydown', onDialogKeyDown);
    render(<Harness onSelectBank={vi.fn()} />);

    await userEvent.type(screen.getByRole('combobox'), 'spark');
    await screen.findByRole('listbox');
    onDialogKeyDown.mockClear();
    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument(),
    );
    expect(onDialogKeyDown).not.toHaveBeenCalled();
    document.removeEventListener('keydown', onDialogKeyDown);
  });

  it('survives a failed search', async () => {
    vi.mocked(send).mockResolvedValue({
      error_code: 'INTERNAL_ERROR',
      error_type: 'EISDIR: illegal operation on a directory, read',
    });
    render(<Harness onSelectBank={vi.fn()} />);

    await userEvent.type(screen.getByRole('combobox'), 'sparkasse');

    expect(
      await screen.findByText('No matching bank found.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('sparkasse');
  });

  it('tells when no bank matches', async () => {
    vi.mocked(send).mockResolvedValue({ banks: [] });
    render(<Harness onSelectBank={vi.fn()} />);

    await userEvent.type(screen.getByRole('combobox'), 'xyz');

    expect(
      await screen.findByText('No matching bank found.'),
    ).toBeInTheDocument();
  });
});
