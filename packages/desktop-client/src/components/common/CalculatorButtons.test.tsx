import React, { useRef, useState } from 'react';

import { evalArithmetic } from '@actual-app/core/shared/arithmetic';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

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
  describe('holding backspace', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      cleanup();
      vi.useRealTimers();
    });

    const setup = () => {
      const result = render(<TestCalculator initialValue="123456789" />);
      const input = screen.getByLabelText('Expression');
      if (!(input instanceof HTMLInputElement)) {
        throw new Error('Expected expression to be an input');
      }
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      return {
        ...result,
        input,
        backspace: screen.getByRole('button', { name: '\u232B' }),
      };
    };

    it('deletes once on a short press', async () => {
      const { input, backspace } = setup();
      fireEvent.pointerDown(backspace, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        width: 10,
        height: 10,
      });
      await act(() => vi.advanceTimersByTime(300));
      expect(input).toHaveValue('123456789');
      fireEvent.pointerUp(backspace, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      });
      fireEvent.click(backspace);
      expect(input).toHaveValue('12345678');
      await act(() => vi.advanceTimersByTime(1000));
      expect(input).toHaveValue('12345678');
    });

    it('repeats during a hold and stops without an extra deletion on release', async () => {
      const { input, backspace } = setup();
      fireEvent.pointerDown(backspace, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        width: 10,
        height: 10,
      });
      await act(() => vi.advanceTimersByTime(600));
      expect(input).toHaveValue('123456');
      expect(input).toHaveFocus();
      expect(input.selectionStart).toBe(6);
      fireEvent.pointerUp(backspace, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      });
      fireEvent.click(backspace);
      await act(() => vi.advanceTimersByTime(1000));
      expect(input).toHaveValue('123456');
    });

    it('deletes the selection first, then continues at the caret', async () => {
      const { input, backspace } = setup();
      input.setSelectionRange(3, 6);
      fireEvent.pointerDown(backspace, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        width: 10,
        height: 10,
      });
      await act(() => vi.advanceTimersByTime(400));
      expect(input).toHaveValue('123789');
      await act(() => vi.advanceTimersByTime(100));
      expect(input).toHaveValue('12789');
      fireEvent.pointerUp(backspace, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      });
      fireEvent.click(backspace);
    });

    it('stops when the pointer leaves the button', async () => {
      const { input, backspace } = setup();
      fireEvent.pointerDown(backspace, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        width: 10,
        height: 10,
      });
      await act(() => vi.advanceTimersByTime(400));
      fireEvent.pointerLeave(backspace, { pointerId: 1, pointerType: 'mouse' });
      await act(() => vi.advanceTimersByTime(1000));
      expect(input).toHaveValue('12345678');
      fireEvent.pointerUp(input, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      });
    });

    it('stops on window blur and clears the timer when unmounted', async () => {
      const { input, backspace, unmount } = setup();
      fireEvent.pointerDown(backspace, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        width: 10,
        height: 10,
      });
      await act(() => vi.advanceTimersByTime(400));
      fireEvent.blur(window);
      await act(() => vi.advanceTimersByTime(1000));
      expect(input).toHaveValue('12345678');
      fireEvent.pointerUp(backspace, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      });
      fireEvent.click(backspace);
      fireEvent.pointerDown(backspace, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        width: 10,
        height: 10,
      });
      unmount();
      await act(() => vi.advanceTimersByTime(1000));
      expect(input).toHaveValue('12345678');
    });

    it('keeps keyboard activation as a single deletion', async () => {
      const { input, backspace } = setup();
      await act(async () => {
        backspace.focus();
      });
      fireEvent.keyDown(backspace, { key: ' ' });
      await act(() => vi.advanceTimersByTime(1000));
      expect(input).toHaveValue('123456789');
      fireEvent.keyUp(backspace, { key: ' ' });
      expect(input).toHaveValue('12345678');
    });
  });

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
