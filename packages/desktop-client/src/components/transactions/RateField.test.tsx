import { useState } from 'react';

import { invertRate } from '@actual-app/core/shared/exchange-rate';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { RateField, storedRate } from './RateField';
import type { RateDirection } from './RateField';

let latest: { value: string; direction: RateDirection } | undefined;

function Field() {
  const [value, setValue] = useState('');
  const [direction, setDirection] = useState<RateDirection>('foreign-per-base');
  latest = { value, direction };
  return (
    <RateField
      name="rate"
      currencyCode="JPY"
      value={value}
      direction={direction}
      onChange={(next, nextDirection) => {
        setValue(next);
        setDirection(nextDirection);
      }}
    />
  );
}

async function typeAndSwap(rate: string) {
  render(<Field />, { wrapper: TestProviders });
  await userEvent.type(screen.getByRole('textbox'), rate);
  await userEvent.click(
    screen.getByRole('button', { name: 'Swap rate direction' }),
  );
}

describe('RateField', () => {
  it('swaps an exactly invertible rate there and back', async () => {
    await typeAndSwap('2');
    expect(latest).toEqual({ value: '0.5', direction: 'base-per-foreign' });
    expect(storedRate(latest!.value, latest!.direction)).toBe('2');
    await userEvent.click(
      screen.getByRole('button', { name: 'Swap rate direction' }),
    );
    expect(latest).toEqual({ value: '2', direction: 'foreign-per-base' });
  });

  it('refuses to swap a rate whose reciprocal does not invert back to it', async () => {
    await typeAndSwap('150');
    expect(latest).toEqual({ value: '150', direction: 'foreign-per-base' });
    expect(
      screen.getByText(
        'This rate cannot be swapped without changing it. Enter it in this direction.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the full reciprocal of a typed reverse rate', () => {
    expect(storedRate('0.006666666666667', 'base-per-foreign')).toBe(
      invertRate('0.006666666666667'),
    );
    expect(invertRate('0.006666666666667')).toBe('149.9999999999925');
  });

  it('refuses to swap the largest rate, whose reciprocal cannot return', async () => {
    await typeAndSwap('999999999999');
    expect(latest).toEqual({
      value: '999999999999',
      direction: 'foreign-per-base',
    });
    expect(
      screen.getByText(
        'This rate cannot be swapped without changing it. Enter it in this direction.',
      ),
    ).toBeInTheDocument();
  });

  it('refuses to swap a rate whose reciprocal cannot be stored', async () => {
    await typeAndSwap('0.000000000000001');
    expect(latest).toEqual({
      value: '0.000000000000001',
      direction: 'foreign-per-base',
    });
    expect(
      screen.getByText(
        'This rate cannot be swapped without changing it. Enter it in this direction.',
      ),
    ).toBeInTheDocument();
  });
});
