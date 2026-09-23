import { fireEvent, render, screen } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { FinancialInput } from './FinancialInput';

it.each([
  [0, '1,234'],
  [2, '12.34'],
  [3, '1.234'],
] as const)('edits stored budget integers at %sdp', (precision, expected) => {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'USD',
        precision,
      }),
    }),
  );
  const onUpdate = vi.fn();
  const { rerender } = render(
    <TestProviders store={store}>
      <FinancialInput value={1234} onUpdate={onUpdate} />
    </TestProviders>,
  );
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  expect(input).toHaveValue(expected);
  fireEvent.blur(input);
  expect(onUpdate).not.toHaveBeenCalled();
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '0' } });
  fireEvent.blur(input);
  expect(onUpdate).toHaveBeenLastCalledWith(0);
  rerender(
    <TestProviders store={store}>
      <FinancialInput value={0} onUpdate={onUpdate} />
    </TestProviders>,
  );
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: expected } });
  fireEvent.blur(input);
  expect(onUpdate).toHaveBeenLastCalledWith(1234);
});

it('uses the currency decimal places when no encoding is recorded', () => {
  const store = createTestAppStore();
  store.dispatch(mergeSyncedPrefs({ defaultCurrencyCode: 'JPY' }));
  render(
    <TestProviders store={store}>
      <FinancialInput value={1200} />
    </TestProviders>,
  );
  fireEvent.focus(screen.getByRole('textbox'));
  expect(screen.getByRole('textbox')).toHaveValue('12');
});

it('retains the old budget amount on invalid input', () => {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'KWD',
        precision: 3,
      }),
    }),
  );
  const onUpdate = vi.fn();
  render(
    <TestProviders store={store}>
      <FinancialInput value={1234} onUpdate={onUpdate} />
    </TestProviders>,
  );
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '1/0' } });
  fireEvent.blur(input);
  expect(onUpdate).not.toHaveBeenCalled();
  expect(input).toHaveValue('1.234');
});

it('restores the formatted amount when Enter is pressed on invalid input', () => {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'KWD',
        precision: 3,
      }),
    }),
  );
  const onUpdate = vi.fn();
  const onEnter = vi.fn();
  render(
    <TestProviders store={store}>
      <FinancialInput value={1234} onUpdate={onUpdate} onEnter={onEnter} />
    </TestProviders>,
  );
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '1/0' } });
  fireEvent.keyUp(input, { key: 'Enter' });
  expect(onUpdate).not.toHaveBeenCalled();
  expect(onEnter).not.toHaveBeenCalled();
  expect(input).toHaveValue('1.234');
});

it('keeps the stored amount when Enter on invalid input is followed by blur and fractions are hidden', () => {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'KWD',
        precision: 3,
      }),
      hideFraction: 'true',
    }),
  );
  const onUpdate = vi.fn();
  render(
    <TestProviders store={store}>
      <FinancialInput value={1234} onUpdate={onUpdate} />
    </TestProviders>,
  );
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '1/0' } });
  fireEvent.keyUp(input, { key: 'Enter' });
  fireEvent.blur(input);
  expect(onUpdate).not.toHaveBeenCalled();
  expect(input).toHaveValue('1');
});
