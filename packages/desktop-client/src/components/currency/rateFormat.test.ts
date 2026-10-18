import { setNumberFormat } from '@actual-app/core/shared/util';

import { formatRate, parseRate } from './rateFormat';

const FORMATS = [
  'comma-dot',
  'dot-comma',
  'space-comma',
  'apostrophe-dot',
] as const;

afterEach(() => {
  setNumberFormat({ format: 'comma-dot', hideFraction: false });
});

describe('rate format', () => {
  it.each([
    ['comma-dot', '1.4137', 1.4137],
    ['comma-dot', '3,000', 3000],
    ['dot-comma', '1,4137', 1.4137],
    ['dot-comma', '3.000', 3000],
    ['space-comma', '1,4137', 1.4137],
    ['space-comma', '3\u202F000', 3000],
    ['space-comma', '3 000', 3000],
    ['apostrophe-dot', '1.4137', 1.4137],
    ['apostrophe-dot', '3\u2019000', 3000],
    ['apostrophe-dot', "3'000", 3000],
  ] as const)('reads %s input "%s" as %d', (format, input, expected) => {
    setNumberFormat({ format, hideFraction: false });
    expect(parseRate(input)).toBe(expected);
  });

  it.each(['', '0', '-1.2', 'abc', '0.0000000009', '1000000001'])(
    'rejects "%s"',
    input => {
      expect(parseRate(input)).toBeNull();
    },
  );

  it.each([
    ['0.000000001', 1e-9],
    ['1000000000', 1e9],
  ])('accepts the bound "%s"', (input, expected) => {
    expect(parseRate(input)).toBe(expected);
  });

  it.each([
    ['comma-dot', '1.4137'],
    ['dot-comma', '1,4137'],
    ['space-comma', '1,4137'],
    ['apostrophe-dot', '1.4137'],
  ] as const)('shows a rate with the %s format as %s', (format, expected) => {
    setNumberFormat({ format, hideFraction: false });
    expect(formatRate(1.4137)).toBe(expected);
  });

  it.each(FORMATS)('reads back a rate shown with the %s format', format => {
    setNumberFormat({ format, hideFraction: false });
    expect(parseRate(formatRate(1.4137))).toBe(1.4137);
    expect(parseRate(formatRate(3000))).toBe(3000);
  });

  it('rounds to the given significant digits without an exponent', () => {
    expect(formatRate(1 / 3000, 6)).toBe('0.000333333');
    expect(formatRate(1 / 30_000_000, 6)).toBe('0.0000000333333');
    expect(formatRate(30_000_000)).toBe('30000000');
  });
});
