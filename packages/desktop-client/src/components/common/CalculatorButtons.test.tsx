import React, { useRef, useState } from 'react';

import { evalArithmetic } from '@actual-app/core/shared/arithmetic';
import { fireEvent, render, screen } from '@testing-library/react';

import { CalculatorButtons } from './CalculatorButtons';

function TestCalculator({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        aria-label="Expression"
        value={value}
        onChange={event => setValue(event.target.value)}
      />
      <CalculatorButtons
        inputRef={inputRef}
        onClear={() => {
          setValue('');
        }}
        onEquals={() => {
          setValue(evalArithmetic(value)?.toString() ?? '');
        }}
      />
    </>
  );
}

describe('CalculatorButtons', () => {
  it('updates a controlled external input from keypad actions', () => {
    render(<TestCalculator />);

    const input = screen.getByLabelText('Expression');

    input.focus();

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(input).toHaveValue('12+3');
    expect(input).toHaveFocus();
    expect(input).toHaveProperty('selectionStart', '12+3'.length);
    expect(input).toHaveProperty('selectionEnd', '12+3'.length);

    fireEvent.click(screen.getByRole('button', { name: '\u232B' }));
    expect(input).toHaveValue('12+');
    expect(input).toHaveFocus();
    expect(input).toHaveProperty('selectionStart', '12+'.length);
    expect(input).toHaveProperty('selectionEnd', '12+'.length);

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    expect(input).toHaveValue('15');
    expect(input).toHaveFocus();
    expect(input).toHaveProperty('selectionStart', '15'.length);
    expect(input).toHaveProperty('selectionEnd', '15'.length);

    fireEvent.click(screen.getByRole('button', { name: 'AC' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(input).toHaveProperty('selectionStart', 0);
    expect(input).toHaveProperty('selectionEnd', 0);
  });

  it('inserts and deletes at the current caret position', () => {
    render(<TestCalculator initialValue="123" />);

    const input = screen.getByLabelText('Expression');

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected expression to be an input');
    }

    input.focus();
    input.setSelectionRange(1, 1);

    fireEvent.click(screen.getByRole('button', { name: '0' }));
    expect(input).toHaveValue('1023');
    expect(input).toHaveFocus();
    expect(input).toHaveProperty('selectionStart', 2);
    expect(input).toHaveProperty('selectionEnd', 2);

    fireEvent.click(screen.getByRole('button', { name: '\u232B' }));
    expect(input).toHaveValue('123');
    expect(input).toHaveFocus();
    expect(input).toHaveProperty('selectionStart', 1);
    expect(input).toHaveProperty('selectionEnd', 1);

    input.setSelectionRange(1, 3);
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    expect(input).toHaveValue('19');
    expect(input).toHaveFocus();
    expect(input).toHaveProperty('selectionStart', 2);
    expect(input).toHaveProperty('selectionEnd', 2);
  });

  it('restores input focus when a keypad press starts after blur', () => {
    render(<TestCalculator initialValue="1+2" />);

    const input = screen.getByLabelText('Expression');

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected expression to be an input');
    }

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.blur();

    fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(input).toHaveValue('1+23');
    expect(input).toHaveFocus();

    input.blur();

    fireEvent.click(screen.getByRole('button', { name: '=' }));

    expect(input).toHaveValue('24');
    expect(input).toHaveFocus();

    input.blur();

    fireEvent.click(screen.getByRole('button', { name: 'AC' }));

    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });
});
