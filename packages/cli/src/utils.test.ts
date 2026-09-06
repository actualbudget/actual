import {
  addMonths,
  isUuid,
  monthEnd,
  monthRange,
  normalizeDate,
  parseAmountToCents,
  parseBoolFlag,
  parseIntFlag,
  resolveDateRange,
} from './utils';

describe('parseBoolFlag', () => {
  it('parses "true"', () => {
    expect(parseBoolFlag('true', '--flag')).toBe(true);
  });

  it('parses "false"', () => {
    expect(parseBoolFlag('false', '--flag')).toBe(false);
  });

  it('rejects other strings', () => {
    expect(() => parseBoolFlag('yes', '--flag')).toThrow(
      'Invalid --flag: "yes". Expected "true" or "false".',
    );
  });

  it('includes the flag name in the error message', () => {
    expect(() => parseBoolFlag('1', '--offbudget')).toThrow(
      'Invalid --offbudget',
    );
  });
});

describe('parseIntFlag', () => {
  it('parses a valid integer string', () => {
    expect(parseIntFlag('42', '--balance')).toBe(42);
  });

  it('parses zero', () => {
    expect(parseIntFlag('0', '--balance')).toBe(0);
  });

  it('parses negative integers', () => {
    expect(parseIntFlag('-10', '--balance')).toBe(-10);
  });

  it('rejects decimal values', () => {
    expect(() => parseIntFlag('3.5', '--balance')).toThrow(
      'Invalid --balance: "3.5". Expected an integer.',
    );
  });

  it('rejects non-numeric strings', () => {
    expect(() => parseIntFlag('abc', '--balance')).toThrow(
      'Invalid --balance: "abc". Expected an integer.',
    );
  });

  it('rejects partially numeric strings', () => {
    expect(() => parseIntFlag('3abc', '--balance')).toThrow(
      'Invalid --balance: "3abc". Expected an integer.',
    );
  });

  it('rejects empty string', () => {
    expect(() => parseIntFlag('', '--balance')).toThrow(
      'Invalid --balance: "". Expected an integer.',
    );
  });

  it('includes the flag name in the error message', () => {
    expect(() => parseIntFlag('x', '--amount')).toThrow('Invalid --amount');
  });
});

describe('isUuid', () => {
  it('accepts v4-style uuids', () => {
    expect(isUuid('e36f7676-2a3a-47cc-a586-46c32ee11e94')).toBe(true);
  });

  it('rejects names', () => {
    expect(isUuid('Checking')).toBe(false);
  });
});

describe('parseAmountToCents', () => {
  it('parses plain decimals', () => {
    expect(parseAmountToCents('12.34')).toBe(1234);
    expect(parseAmountToCents('-7')).toBe(-700);
    expect(parseAmountToCents('0.5')).toBe(50);
  });

  it('strips currency symbols and thousands separators', () => {
    expect(parseAmountToCents('$1,234.56')).toBe(123456);
    expect(parseAmountToCents('-$1,234.56')).toBe(-123456);
  });

  it('treats parentheses as negative', () => {
    expect(parseAmountToCents('(45.00)')).toBe(-4500);
  });

  it('rounds a third decimal place', () => {
    expect(parseAmountToCents('1.005')).toBe(101);
    expect(parseAmountToCents('1.004')).toBe(100);
  });

  it('rejects non-numeric input', () => {
    expect(() => parseAmountToCents('abc', '--amount')).toThrow(
      'Invalid --amount: "abc". Expected a number.',
    );
    expect(() => parseAmountToCents('', '--amount')).toThrow('empty value');
  });
});

describe('month helpers', () => {
  it('adds and subtracts months across year boundaries', () => {
    expect(addMonths('2024-11', 3)).toBe('2025-02');
    expect(addMonths('2024-01', -1)).toBe('2023-12');
  });

  it('computes month end including leap years', () => {
    expect(monthEnd('2024-02')).toBe('2024-02-29');
    expect(monthEnd('2023-02')).toBe('2023-02-28');
    expect(monthEnd('2024-12')).toBe('2024-12-31');
  });

  it('builds inclusive month ranges', () => {
    expect(monthRange('2024-11', '2025-01')).toEqual([
      '2024-11',
      '2024-12',
      '2025-01',
    ]);
  });
});

describe('resolveDateRange', () => {
  it('expands --month to the full month', () => {
    expect(resolveDateRange({ month: '2024-02' })).toEqual({
      start: '2024-02-01',
      end: '2024-02-29',
    });
  });

  it('passes through --start/--end', () => {
    expect(
      resolveDateRange({ start: '2024-01-05', end: '2024-01-10' }),
    ).toEqual({ start: '2024-01-05', end: '2024-01-10' });
  });

  it('rejects mixing --month with --start/--end', () => {
    expect(() =>
      resolveDateRange({ month: '2024-01', start: '2024-01-01' }),
    ).toThrow('--month cannot be combined');
  });

  it('requires both --start and --end', () => {
    expect(() => resolveDateRange({ start: '2024-01-01' })).toThrow(
      'must be provided together',
    );
  });

  it('rejects inverted ranges and bad months', () => {
    expect(() =>
      resolveDateRange({ start: '2024-02-01', end: '2024-01-01' }),
    ).toThrow('on or before');
    expect(() => resolveDateRange({ month: '2024-13' })).toThrow('YYYY-MM');
  });

  it('defaults to the current month', () => {
    const range = resolveDateRange({});
    expect(range.start).toMatch(/^\d{4}-\d{2}-01$/);
    expect(range.end.slice(0, 7)).toBe(range.start.slice(0, 7));
  });
});

describe('normalizeDate', () => {
  it('accepts ISO dates as-is', () => {
    expect(normalizeDate('2024-03-09')).toBe('2024-03-09');
    expect(normalizeDate('2024-3-9')).toBe('2024-03-09');
  });

  it('auto-detects US and EU formats', () => {
    expect(normalizeDate('3/9/2024')).toBe('2024-03-09');
    expect(normalizeDate('3/9/24')).toBe('2024-03-09');
    expect(normalizeDate('9.3.2024')).toBe('2024-03-09');
  });

  it('honors an explicit format', () => {
    expect(normalizeDate('09/03/2024', 'DD/MM/YYYY')).toBe('2024-03-09');
    expect(normalizeDate('20240309', 'YYYYMMDD')).toBe('2024-03-09');
    expect(normalizeDate('3-9-24', 'M-D-YY')).toBe('2024-03-09');
  });

  it('throws on mismatched or unrecognized input', () => {
    expect(() => normalizeDate('2024/03/09', 'DD/MM/YYYY')).toThrow(
      'does not match format',
    );
    expect(() => normalizeDate('March 9')).toThrow('Unrecognized date');
  });
});
