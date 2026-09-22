import { appendDecimals, setNumberFormat } from './util';

it.each([
  [0, '1234', '1,234'],
  [2, '1234', '12.34'],
  [3, '1234', '1.234'],
  [3, '-1', '-0.001'],
  [3, '', ''],
  [3, '0', '0.000'],
])('appends %s decimals to %s', (precision, input, expected) => {
  setNumberFormat({ format: 'comma-dot', hideFraction: false });
  expect(appendDecimals(input, false, precision)).toBe(expected);
});

it('uses the selected decimal separator and preserves whole-unit entry', () => {
  setNumberFormat({ format: 'dot-comma', hideFraction: false });
  expect(appendDecimals('1234', false, 3)).toBe('1,234');
  expect(appendDecimals('1234', true, 3)).toBe('1.234');
  setNumberFormat({ format: 'comma-dot', hideFraction: false });
});
