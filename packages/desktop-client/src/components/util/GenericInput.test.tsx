import React, { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { GenericInput } from './GenericInput';

describe('GenericInput', () => {
  it('uses the configured sign for an empty currency value', async () => {
    const user = userEvent.setup();
    const inputRef = createRef<
      HTMLInputElement & { getCurrentAmount: () => number }
    >();

    render(
      <GenericInput
        ref={inputRef}
        type="number"
        value={0}
        onChange={vi.fn()}
        numberFormatType="currency"
        zeroSign="+"
      />,
      { wrapper: TestProviders },
    );

    expect(
      screen.getByRole('button', { name: 'Make negative' }),
    ).toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '150');

    expect(inputRef.current?.getCurrentAmount()).toBe(15000);
  });

  it('preserves the sign of an existing currency value', () => {
    const inputRef = createRef<
      HTMLInputElement & { getCurrentAmount: () => number }
    >();

    render(
      <GenericInput
        ref={inputRef}
        type="number"
        value={-15000}
        onChange={vi.fn()}
        numberFormatType="currency"
        zeroSign="+"
      />,
      { wrapper: TestProviders },
    );

    expect(
      screen.getByRole('button', { name: 'Make positive' }),
    ).toBeInTheDocument();
    expect(inputRef.current?.getCurrentAmount()).toBe(-15000);
  });
});
