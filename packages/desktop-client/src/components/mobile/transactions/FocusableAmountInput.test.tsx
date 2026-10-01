import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { AmountInput } from './AmountInput';
import { FocusableAmountInput } from './FocusableAmountInput';

describe('FocusableAmountInput sign synchronization', () => {
  it('uses the expense default after a positive amount is cleared', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <AmountInput value={1200} negate onChange={onChange} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();

    rerender(<AmountInput value={0} negate onChange={onChange} />);

    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '0.00' }));
    const input = screen.getByTestId('amount-input');
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledExactlyOnceWith(-5);
  });

  it('uses the income default after a negative amount is cleared', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <AmountInput value={-1200} onChange={onChange} />,
      { wrapper: TestProviders },
    );

    rerender(<AmountInput value={0} onChange={onChange} />);

    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '0.00' }));
    const input = screen.getByTestId('amount-input');
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.keyUp(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledExactlyOnceWith(5);
  });

  it('updates the zero default when the transaction direction changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<AmountInput value={0} onChange={onChange} />, {
      wrapper: TestProviders,
    });

    rerender(<AmountInput value={0} negate onChange={onChange} />);
    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument();

    rerender(<AmountInput value={0} onChange={onChange} />);
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('synchronizes both directions when no explicit sign is provided', () => {
    const onUpdateAmount = vi.fn();
    const { rerender } = render(
      <FocusableAmountInput value={1200} onUpdateAmount={onUpdateAmount} />,
      { wrapper: TestProviders },
    );

    rerender(
      <FocusableAmountInput value={-1200} onUpdateAmount={onUpdateAmount} />,
    );
    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument();

    rerender(
      <FocusableAmountInput value={1200} onUpdateAmount={onUpdateAmount} />,
    );
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
    expect(onUpdateAmount).not.toHaveBeenCalled();
  });

  it('keeps an explicit sign ahead of the value and zero default', () => {
    const { rerender } = render(
      <FocusableAmountInput value={1200} sign="-" zeroSign="+" />,
      { wrapper: TestProviders },
    );
    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument();

    rerender(<FocusableAmountInput value={-1200} sign="+" zeroSign="-" />);
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();

    rerender(<FocusableAmountInput value={0} sign="+" zeroSign="-" />);
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();

    rerender(<FocusableAmountInput value={0} zeroSign="-" />);
    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument();
  });

  it('retains a manually selected zero sign across unrelated rerenders', () => {
    const onUpdateAmount = vi.fn();
    const { rerender } = render(
      <FocusableAmountInput
        value={0}
        zeroSign="-"
        onUpdateAmount={onUpdateAmount}
      />,
      { wrapper: TestProviders },
    );

    fireEvent.click(screen.getByRole('button', { name: '-' }));
    expect(onUpdateAmount).toHaveBeenCalledExactlyOnceWith(0);
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();

    rerender(
      <FocusableAmountInput
        value={0}
        zeroSign="-"
        onUpdateAmount={onUpdateAmount}
        textStyle={{ fontSize: 16 }}
      />,
    );
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
    expect(onUpdateAmount).toHaveBeenCalledTimes(1);

    rerender(
      <FocusableAmountInput
        value={0}
        zeroSign="-"
        onUpdateAmount={onUpdateAmount}
        focused
      />,
    );
    const input = screen.getByTestId('amount-input');
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.blur(input);
    expect(onUpdateAmount).toHaveBeenLastCalledWith(5);
  });

  it('does not toggle the direction while disabled', () => {
    const onUpdateAmount = vi.fn();
    render(
      <FocusableAmountInput
        value={0}
        zeroSign="-"
        disabled
        onUpdateAmount={onUpdateAmount}
      />,
      { wrapper: TestProviders },
    );

    fireEvent.click(screen.getByRole('button', { name: '-' }));

    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument();
    expect(onUpdateAmount).not.toHaveBeenCalled();
  });
});
