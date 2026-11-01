import { MemoryRouter } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { ExperimentalFeatures } from './Experimental';

let mockPrefs: Record<string, string> = {};
const mockSetPref = vi.fn();

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    mockPrefs[name],
    (value: string) => mockSetPref(name, value),
  ],
}));

vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: () => 'no-server',
}));

function renderFeatures() {
  render(
    <MemoryRouter>
      <TestProviders>
        <ExperimentalFeatures />
      </TestProviders>
    </MemoryRouter>,
  );
}

describe('ExperimentalFeatures', () => {
  beforeEach(() => {
    mockPrefs = {};
    mockSetPref.mockClear();
  });

  it('turns multiple currencies off with currency support', async () => {
    mockPrefs = { 'flags.currency': 'true', 'flags.multiCurrency': 'true' };
    renderFeatures();

    await userEvent.click(screen.getByLabelText('Currency support'));

    expect(mockSetPref).toHaveBeenCalledWith('flags.currency', 'false');
    expect(mockSetPref).toHaveBeenCalledWith('flags.multiCurrency', 'false');
  });

  it('leaves multiple currencies unsaved when they were never on', async () => {
    mockPrefs = { 'flags.currency': 'true' };
    renderFeatures();

    await userEvent.click(screen.getByLabelText('Currency support'));

    expect(mockSetPref).toHaveBeenCalledWith('flags.currency', 'false');
    expect(mockSetPref).not.toHaveBeenCalledWith(
      'flags.multiCurrency',
      expect.anything(),
    );
  });
});
