import { parseAmountEncoding, reviewedAmountEncoding } from './amount-encoding';

describe('amount encoding metadata', () => {
  it('uses the reviewed snapshot without changing runtime currency metadata', () => {
    expect(reviewedAmountEncoding('USD')).toEqual({
      version: 1,
      currencyCode: 'USD',
      precision: 2,
    });
    expect(reviewedAmountEncoding('RSD').precision).toBe(2);
    expect(
      parseAmountEncoding(
        JSON.stringify({ version: 1, currencyCode: 'RSD', precision: 0 }),
      ),
    ).toEqual({ version: 1, currencyCode: 'RSD', precision: 0 });
  });

  it('rejects empty, unreviewed and malformed encoding data', () => {
    expect(() => reviewedAmountEncoding('')).toThrow();
    expect(() => reviewedAmountEncoding('XYZ')).toThrow();
    expect(() => parseAmountEncoding('{"version":2}')).toThrow();
    expect(parseAmountEncoding(undefined)).toBeNull();
  });
});

it.each([
  ['CLP', 0],
  ['COP', 0],
  ['HUF', 0],
  ['IDR', 0],
  ['PKR', 0],
] as const)(
  'resolves the reviewed target for %s to %i decimals',
  (code, precision) => {
    expect(reviewedAmountEncoding(code).precision).toBe(precision);
  },
);
