import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AmountInput } from './AmountInput';

import { useIsMobileCalculatorKeypadEnabled } from '@desktop-client/hooks/useIsMobileCalculatorKeypadEnabled';
import { mergeSyncedPrefs } from '@desktop-client/prefs/prefsSlice';
import {
  TestProvider,
  mockStore,
  resetMockStore,
} from '@desktop-client/redux/mock';

vi.mock('react-hotkeys-hook', () => ({
  useHotkeysContext: () => ({
    enableScope: () => {},
    disableScope: () => {},
  }),
}));

vi.mock('@desktop-client/hooks/useIsMobileCalculatorKeypadEnabled', () => ({
  useIsMobileCalculatorKeypadEnabled: vi.fn(),
}));

describe('AmountInput mobile calculator keypad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockStore();
    mockStore.dispatch(mergeSyncedPrefs({ numberFormat: 'comma-dot' }));
  });

  test('opens keypad on pointer activation and commits arithmetic', async () => {
    vi.mocked(useIsMobileCalculatorKeypadEnabled).mockReturnValue(true);

    const onUpdate = vi.fn();
    const user = userEvent.setup();

    render(
      <TestProvider>
        <AmountInput value={0} onUpdate={onUpdate} />
      </TestProvider>,
    );

    const textbox = screen.getByRole('textbox');
    await user.click(textbox);

    expect(screen.getByTestId('money-keypad-modal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '+' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));

    // Default `zeroSign` is '-', so the expression is treated as an outflow:
    // -(1 + 2) dollars => -3.00 => -300 cents
    expect(onUpdate).toHaveBeenCalledWith(-300);
  });

  test('supports multiply and divide operator buttons', async () => {
    vi.mocked(useIsMobileCalculatorKeypadEnabled).mockReturnValue(true);

    const onUpdate = vi.fn();
    const user = userEvent.setup();

    render(
      <TestProvider>
        <AmountInput value={0} onUpdate={onUpdate} />
      </TestProvider>,
    );

    await user.click(screen.getByRole('textbox'));
    expect(screen.getByTestId('money-keypad-modal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: 'Multiply' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(onUpdate).toHaveBeenCalledWith(-200);

    await user.click(screen.getByRole('textbox'));
    expect(screen.getByTestId('money-keypad-modal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: 'Divide' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(onUpdate).toHaveBeenLastCalledWith(-200);
  });

  test('does not open keypad when focused programmatically (focused prop)', async () => {
    vi.mocked(useIsMobileCalculatorKeypadEnabled).mockReturnValue(true);

    render(
      <TestProvider>
        <AmountInput value={0} focused={true} />
      </TestProvider>,
    );

    // Programmatic focus should not open the keypad.
    await waitFor(() => {
      expect(
        screen.queryByTestId('money-keypad-modal'),
      ).not.toBeInTheDocument();
    });
  });

  test('closing the keypad does not immediately reopen it', async () => {
    vi.mocked(useIsMobileCalculatorKeypadEnabled).mockReturnValue(true);

    const user = userEvent.setup();

    render(
      <TestProvider>
        <AmountInput value={0} />
      </TestProvider>,
    );

    await user.click(screen.getByRole('textbox'));
    expect(await screen.findByTestId('money-keypad-modal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(
        screen.queryByTestId('money-keypad-modal'),
      ).not.toBeInTheDocument();
    });

    // Give any deferred focus handlers a chance to run.
    await waitFor(() => {
      expect(
        screen.queryByTestId('money-keypad-modal'),
      ).not.toBeInTheDocument();
    });
  });

  test('uses localized decimal separator on keypad', async () => {
    vi.mocked(useIsMobileCalculatorKeypadEnabled).mockReturnValue(true);
    mockStore.dispatch(mergeSyncedPrefs({ numberFormat: 'dot-comma' }));

    const user = userEvent.setup();

    render(
      <TestProvider>
        <AmountInput value={0} />
      </TestProvider>,
    );

    await user.click(screen.getByRole('textbox'));
    const keypad = await screen.findByTestId('money-keypad-modal');

    await user.click(within(keypad).getByRole('button', { name: ',' }));
    expect(within(keypad).getByLabelText('Calculator input')).toHaveValue(',');
  });
});

describe('AmountInput expression typing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does not strip operators when autoDecimals is enabled', async () => {
    vi.mocked(useIsMobileCalculatorKeypadEnabled).mockReturnValue(false);

    const user = userEvent.setup();

    render(
      <TestProvider>
        <AmountInput value={0} autoDecimals={true} />
      </TestProvider>,
    );

    const textbox = screen.getByRole('textbox');
    await user.click(textbox);
    await user.type(textbox, '123+45');

    expect(textbox).toHaveDisplayValue(/\+/);
  });
});
