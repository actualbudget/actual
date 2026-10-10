import {
  addUtcDays,
  baseToNative,
  invertRate,
  isCanonicalTimestamp,
  isValidDate,
  nativeToBase,
  parseRate,
  utcDay,
  utcEndOfDay,
  utcMidnight,
} from './exchange-rate';

describe('parseRate', () => {
  it('canonicalizes valid rates', () => {
    expect(parseRate('150')).toBe('150');
    expect(parseRate('0150.500')).toBe('150.5');
    expect(parseRate('0.000000000000001')).toBe('0.000000000000001');
    expect(parseRate(1.25)).toBe('1.25');
    expect(parseRate('999999999999.999999999999999')).toBe(
      '999999999999.999999999999999',
    );
  });

  it.each([
    '0',
    '0.000',
    '-1',
    '',
    '1e5',
    '1.',
    '.5',
    ' 1',
    '1000000000000',
    '1.0000000000000001',
    `0.${'0'.repeat(40)}1`,
    '1'.repeat(33),
  ])('rejects %j', input => {
    expect(() => parseRate(input)).toThrow('rate-invalid');
  });

  it.each([0, -1, Number.NaN, Infinity, 1e-7, 1e21])(
    'rejects number %s',
    input => {
      expect(() => parseRate(input)).toThrow('rate-invalid');
    },
  );

  it('rejects non-string, non-number input', () => {
    expect(() => parseRate(null)).toThrow('rate-invalid');
    expect(() => parseRate({})).toThrow('rate-invalid');
  });
});

describe('conversion', () => {
  it('converts across 0dp, 2dp and 3dp', () => {
    // 150 JPY per USD: 1500 JPY is 10.00 USD.
    expect(nativeToBase(1500, 0, 2, '150')).toBe(1000);
    expect(baseToNative(1000, 2, 0, '150')).toBe(1500);
    // 500 JPY per KWD: 1000 JPY is 2.000 KWD.
    expect(nativeToBase(1000, 0, 3, '500')).toBe(2000);
    // 0.3071 KWD per USD: 123.457 KWD is 402 whole units at 0dp.
    expect(nativeToBase(123457, 3, 0, '0.3071')).toBe(402);
  });

  it('rounds ties to even for both signs', () => {
    expect(nativeToBase(1, 0, 0, '2')).toBe(0);
    expect(nativeToBase(3, 0, 0, '2')).toBe(2);
    expect(nativeToBase(-1, 0, 0, '2')).toBe(0);
    expect(nativeToBase(-3, 0, 0, '2')).toBe(-2);
    expect(baseToNative(5, 1, 0, '1')).toBe(0);
    expect(baseToNative(15, 1, 0, '1')).toBe(2);
  });

  it('round-trips mixed precisions through the inverse', () => {
    const base = nativeToBase(1000000, 0, 3, '500.123');
    expect(base).toBe(1999508);
    expect(baseToNative(base, 3, 0, '500.123')).toBe(1000000);
    expect(nativeToBase(-1000000, 0, 3, '500.123')).toBe(-1999508);
    // Converting to fewer places is lossy and does not recover precision.
    expect(
      baseToNative(nativeToBase(123457, 3, 0, '0.3071'), 0, 3, '0.3071'),
    ).toBe(123454);
  });

  it('handles values near the safe limit', () => {
    expect(nativeToBase(Number.MAX_SAFE_INTEGER, 0, 2, '1000')).toBe(
      900719925474099,
    );
    expect(() => nativeToBase(10, 2, 2, '0.000000000000001')).toThrow(
      'amount-out-of-range',
    );
    expect(() => baseToNative(Number.MAX_SAFE_INTEGER, 0, 3, '2')).toThrow(
      'amount-out-of-range',
    );
  });

  it('rejects invalid amounts and precisions', () => {
    expect(() => nativeToBase(1.5, 2, 2, '1')).toThrow('amount-invalid');
    expect(() => nativeToBase(1, 16, 2, '1')).toThrow('precision-invalid');
    expect(() => nativeToBase(1, 2, -1, '1')).toThrow('precision-invalid');
    expect(() => nativeToBase(1, 2, 2, '0')).toThrow('rate-invalid');
  });

  it('supports reviewed precisions beyond 0, 2 and 3', () => {
    expect(nativeToBase(12345678, 8, 4, '1')).toBe(1235);
  });
});

describe('invertRate', () => {
  it('returns the reciprocal rounded to 15 places', () => {
    expect(invertRate('0.0063')).toBe('158.73015873015873');
    expect(invertRate('158.73015873015873')).toBe('0.0063');
    expect(invertRate('4')).toBe('0.25');
    expect(invertRate('0.5')).toBe('2');
  });

  it('handles the smallest and largest reciprocals', () => {
    expect(invertRate('999999999999')).toBe('0.000000000001');
    expect(() => invertRate('0.000000000000001')).toThrow('rate-invalid');
  });
});

describe('UTC dates', () => {
  it('validates calendar dates', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-2-3')).toBe(false);
    expect(isValidDate(20260203)).toBe(false);
  });

  it('uses midnight UTC and day arithmetic', () => {
    expect(utcMidnight('2026-03-01')).toBe('2026-03-01T00:00:00.000Z');
    expect(utcDay('2026-02-28T23:59:59.999Z')).toBe('2026-02-28');
    expect(addUtcDays('2026-03-01', -7)).toBe('2026-02-22');
    expect(addUtcDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(() => utcMidnight('2026-13-01')).toThrow('date-invalid');
  });
});

describe('canonical timestamps', () => {
  it('accepts only toISOString output', () => {
    expect(isCanonicalTimestamp('2026-03-10T06:00:00.000Z')).toBe(true);
    expect(isCanonicalTimestamp('2026-03-10T06:00:00Z')).toBe(false);
    expect(isCanonicalTimestamp('2026-03-10')).toBe(false);
    expect(isCanonicalTimestamp('not a date')).toBe(false);
    expect(isCanonicalTimestamp(null)).toBe(false);
    expect(utcEndOfDay('9999-12-31')).toBe('9999-12-31T23:59:59.999Z');
  });
});
