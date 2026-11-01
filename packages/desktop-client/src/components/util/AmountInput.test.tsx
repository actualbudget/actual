import type { ReactNode } from 'react';
import { createRef } from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AmountInput as MobileAmountInput } from '#components/mobile/transactions/AmountInput';
import { SplitAmountInput } from '#components/mobile/transactions/SplitAmountInput';
import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { AmountInput } from './AmountInput';

const prefs = {
  precision: 3 as number | undefined,
  calculator: false,
};
let store = createTestAppStore();
function renderInput(children: ReactNode) {
  store.dispatch(
    mergeSyncedPrefs({
      amountEncoding:
        prefs.precision === undefined
          ? undefined
          : JSON.stringify({
              version: 1,
              currencyCode: 'USD',
              precision: prefs.precision,
            }),
      numberFormat: 'comma-dot',
      'flags.mobileCalculator': String(prefs.calculator),
    }),
  );
  return render(<TestProviders store={store}>{children}</TestProviders>);
}

beforeEach(() => {
  store = createTestAppStore();
  prefs.precision = 3;
  prefs.calculator = false;
});

it('keeps a hidden fraction until the text is edited', () => {
  prefs.precision = undefined;
  store.dispatch(
    mergeSyncedPrefs({ defaultCurrencyCode: 'JPY', hideFraction: 'true' }),
  );
  const onUpdate = vi.fn();
  renderInput(<AmountInput value={150050} onUpdate={onUpdate} />);
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.keyUp(input, { key: 'Enter' });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole('button', { name: 'Make negative' }));
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.change(input, { target: { value: '1,501' } });
  fireEvent.blur(input);
  expect(onUpdate.mock.calls).toEqual([
    [150050],
    [150050],
    [-150050],
    [-150100],
  ]);
});

it.each([
  [0, '1,234', 5],
  [2, '12.34', 512],
  [3, '1.234', 5123],
  [undefined, '12.34', 512],
] as const)(
  'desktop reads stored precision %s and returns integers',
  (precision, display, result) => {
    prefs.precision = precision;
    const onUpdate = vi.fn();
    renderInput(<AmountInput value={1234} onUpdate={onUpdate} zeroSign="+" />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(input).toHaveValue(display);
    expect(input).toMatchSnapshot();
    fireEvent.change(input, { target: { value: '5.123' } });
    expect(input).toHaveValue('5.123');
    fireEvent.blur(input);
    expect(onUpdate).toHaveBeenLastCalledWith(result);
  },
);

it('calculator keeps the last valid amount while an expression is incomplete', () => {
  prefs.calculator = true;
  const onChange = vi.fn();
  renderInput(
    <MobileAmountInput autoFocus value={1.234} onChange={onChange} />,
  );
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '12' } });
  fireEvent.change(input, { target: { value: '12+' } });
  fireEvent.blur(input);
  expect(onChange).toHaveBeenLastCalledWith(12);
});

describe.each([false, true])('mobile calculator %s', calculator => {
  beforeEach(() => {
    prefs.calculator = calculator;
  });

  it.each(['amount', 'split'])(
    '%s preserves 3dp major units and clears',
    kind => {
      const onChange = vi.fn();
      renderInput(
        kind === 'amount' ? (
          <MobileAmountInput autoFocus value={1.234} onChange={onChange} />
        ) : (
          <SplitAmountInput value={1.234} onChange={onChange} />
        ),
      );
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      if (calculator) expect(input).toHaveValue('1.234');
      fireEvent.change(input, {
        target: { value: calculator ? '5.123' : '5123' },
      });
      expect(input).toHaveValue('5.123');
      expect(input).toMatchSnapshot();
      fireEvent.blur(input);
      expect(onChange).toHaveBeenLastCalledWith(5.123);
      fireEvent.focus(input);
      fireEvent.keyUp(input, { key: 'Backspace' });
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);
      expect(onChange).toHaveBeenLastCalledWith(0);
    },
  );
});

it.each([false, true])(
  'reformats calculator %s after recorded precision changes',
  async calculator => {
    prefs.calculator = calculator;
    const onChange = vi.fn();
    renderInput(<SplitAmountInput value={12} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('12.000');
    await act(() =>
      store.dispatch(
        mergeSyncedPrefs({
          amountEncoding: JSON.stringify({
            version: 1,
            currencyCode: 'JPY',
            precision: 0,
          }),
        }),
      ),
    );
    expect(input).toHaveValue('12');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '345' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(345);
  },
);

it('does not commit an invalid or overflowing desktop amount', () => {
  const onUpdate = vi.fn();
  const ref = createRef<
    HTMLInputElement & { getCurrentAmount?: () => number }
  >();
  renderInput(<AmountInput ref={ref} value={1234} onUpdate={onUpdate} />);
  const input = screen.getByRole('textbox');
  for (const value of ['1/0', '999999999999999999', 'invalid']) {
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value } });
    expect(ref.current?.getCurrentAmount?.()).toBe(1234);
    fireEvent.blur(input);
    expect(onUpdate).not.toHaveBeenCalled();
  }
});

it.each([false, true])(
  'negative mobile input with calculator %s',
  calculator => {
    prefs.calculator = calculator;
    const onChange = vi.fn();
    renderInput(
      <MobileAmountInput autoFocus negate value={-1.234} onChange={onChange} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, {
      target: { value: calculator ? '2.345' : '2345' },
    });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(-2.345);
  },
);

it('pastes a 3dp amount and evaluates calculator arithmetic', async () => {
  prefs.calculator = true;
  const user = userEvent.setup();
  const onChange = vi.fn();
  renderInput(<MobileAmountInput autoFocus value={0} onChange={onChange} />);
  const input = screen.getByRole('textbox');
  await user.paste('1.234 + 2.001');
  fireEvent.blur(input);
  expect(onChange).toHaveBeenLastCalledWith(3.235);
  expect(input).toHaveValue('3.235');
});

it.each([false, true])(
  'does not commit overflowing mobile input with calculator %s',
  calculator => {
    prefs.calculator = calculator;
    const onChange = vi.fn();
    renderInput(
      <MobileAmountInput autoFocus value={1.234} onChange={onChange} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '999999999999999999999' } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  },
);

it('rounds calculator results to the precision used for display', () => {
  prefs.calculator = true;
  const onChange = vi.fn();
  renderInput(<SplitAmountInput value={0} onChange={onChange} />);
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '1/3' } });
  fireEvent.blur(input);
  expect(onChange).toHaveBeenLastCalledWith(0.333);
  expect(input).toHaveValue('0.333');
});

it('preserves stored fractions when focusing an amount with fractions hidden', () => {
  const onUpdate = vi.fn();
  store.dispatch(mergeSyncedPrefs({ hideFraction: 'true' }));
  renderInput(<AmountInput value={1234} onUpdate={onUpdate} />);
  const input = screen.getByRole('textbox');
  expect(input).toHaveValue('1');
  fireEvent.focus(input);
  expect(input).toHaveValue('1.234');
  fireEvent.blur(input);
  expect(onUpdate).toHaveBeenLastCalledWith(1234);
});

it('enters whole yen at legacy storage precision with automatic decimals', () => {
  prefs.precision = undefined;
  store.dispatch(mergeSyncedPrefs({ defaultCurrencyCode: 'JPY' }));
  const onUpdate = vi.fn();
  renderInput(<AmountInput value={0} autoDecimals onUpdate={onUpdate} />);
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '1500' } });
  expect(input).toHaveValue('1,500');
  fireEvent.blur(input);
  expect(onUpdate).toHaveBeenLastCalledWith(-150000);
});
