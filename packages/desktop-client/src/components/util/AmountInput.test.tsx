import React from 'react';

import { act, render, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { AmountInput } from './AmountInput';

type AmountInputTestProps = {
  focused?: boolean;
  disabled?: boolean;
};

function renderAmountInput(props: AmountInputTestProps) {
  const { rerender, ...rest } = render(
    <TestProviders>
      <AmountInput value={0} {...props} />
    </TestProviders>,
  );

  return {
    ...rest,
    rerender: (nextProps: AmountInputTestProps) =>
      rerender(
        <TestProviders>
          <AmountInput value={0} {...nextProps} />
        </TestProviders>,
      ),
  };
}

describe('AmountInput', () => {
  it('focuses the input when it mounts already focused', () => {
    renderAmountInput({ focused: true });

    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('focuses the input when it becomes focused', () => {
    const { rerender } = renderAmountInput({ focused: false });

    expect(screen.getByRole('textbox')).not.toHaveFocus();

    rerender({ focused: true });

    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  // A disabled input cannot receive DOM focus, so a focus request that arrives
  // while the input is still disabled would otherwise be dropped silently.
  it('honours a focus request that arrives while the input is disabled', () => {
    const { rerender } = renderAmountInput({ focused: false, disabled: true });

    rerender({ focused: true, disabled: true });

    expect(screen.getByRole('textbox')).not.toHaveFocus();

    rerender({ focused: true, disabled: false });

    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  // A pending request must not outlive the reason for it: if this input stops
  // being the field that should be focused while it is still disabled, the
  // request is dropped rather than fired whenever the input is re-enabled.
  it('drops a pending focus request when it stops being the focus target', () => {
    const { rerender } = renderAmountInput({ focused: false, disabled: true });

    rerender({ focused: true, disabled: true });
    rerender({ focused: false, disabled: true });

    rerender({ focused: false, disabled: false });

    expect(screen.getByRole('textbox')).not.toHaveFocus();
  });

  it('does not re-focus the input when it is re-enabled after the focus request was already honoured', () => {
    const { rerender } = renderAmountInput({ focused: true, disabled: false });

    const amountInput = screen.getByRole('textbox');
    expect(amountInput).toHaveFocus();

    // The user moves on to another field, which disables this one.
    const otherInput = document.createElement('input');
    document.body.appendChild(otherInput);
    act(() => otherInput.focus());
    rerender({ focused: true, disabled: true });

    // Editing the other field finishes and this one is enabled again. The
    // focus request was already honoured, so focus must stay where the user
    // put it.
    rerender({ focused: true, disabled: false });

    expect(amountInput).not.toHaveFocus();
    expect(otherInput).toHaveFocus();

    otherInput.remove();
  });
});
