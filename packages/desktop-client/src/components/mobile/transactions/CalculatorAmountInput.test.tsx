import React from 'react';

import { act, render, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { CalculatorAmountInput } from './CalculatorAmountInput';

type CalculatorAmountInputTestProps = {
  autoFocus?: boolean;
  disabled?: boolean;
};

function renderCalculatorAmountInput(props: CalculatorAmountInputTestProps) {
  const { rerender, ...rest } = render(
    <TestProviders>
      <CalculatorAmountInput value={0} {...props} />
    </TestProviders>,
  );

  return {
    ...rest,
    rerender: (nextProps: CalculatorAmountInputTestProps) =>
      rerender(
        <TestProviders>
          <CalculatorAmountInput value={0} {...nextProps} />
        </TestProviders>,
      ),
  };
}

describe('CalculatorAmountInput', () => {
  it('focuses the input when it mounts with autoFocus', () => {
    renderCalculatorAmountInput({ autoFocus: true });

    expect(screen.getByTestId('amount-input')).toHaveFocus();
  });

  // A disabled input cannot receive DOM focus, so a focus request that arrives
  // while the input is still disabled would otherwise be dropped silently. On
  // mobile split rows the row being focused is still rendered disabled while
  // the previous row is the active edit.
  it('honours a focus request that arrives while the input is disabled', () => {
    const { rerender } = renderCalculatorAmountInput({
      autoFocus: false,
      disabled: true,
    });

    rerender({ autoFocus: true, disabled: true });

    expect(screen.getByTestId('amount-input')).not.toHaveFocus();

    rerender({ autoFocus: true, disabled: false });

    expect(screen.getByTestId('amount-input')).toHaveFocus();
  });

  // A pending request must not outlive the reason for it: if this input stops
  // being the field that should be focused while it is still disabled, the
  // request is dropped rather than fired whenever the input is re-enabled.
  it('drops a pending focus request when it stops being the focus target', () => {
    const { rerender } = renderCalculatorAmountInput({
      autoFocus: false,
      disabled: true,
    });

    rerender({ autoFocus: true, disabled: true });
    rerender({ autoFocus: false, disabled: true });

    rerender({ autoFocus: false, disabled: false });

    expect(screen.getByTestId('amount-input')).not.toHaveFocus();
  });

  it('does not re-focus the input when it is re-enabled after the focus request was already honoured', () => {
    const { rerender } = renderCalculatorAmountInput({
      autoFocus: true,
      disabled: false,
    });

    const amountInput = screen.getByTestId('amount-input');
    expect(amountInput).toHaveFocus();

    // The user moves on to another field, which disables this one.
    const otherInput = document.createElement('input');
    document.body.appendChild(otherInput);
    act(() => otherInput.focus());
    rerender({ autoFocus: true, disabled: true });

    // Editing the other field finishes and this one is enabled again. The
    // focus request was already honoured, so focus must stay where the user
    // put it.
    rerender({ autoFocus: true, disabled: false });

    expect(amountInput).not.toHaveFocus();
    expect(otherInput).toHaveFocus();

    otherInput.remove();
  });
});
