import { formatExchangeRatesCsv, parseExchangeRatesCsv } from './import';

describe('formatExchangeRatesCsv', () => {
  const rates = [
    {
      date: '2026-10-02',
      from_currency: 'USD',
      to_currency: 'CAD',
      rate: 1.39,
    },
    {
      date: '2026-10-01',
      from_currency: 'USD',
      to_currency: 'CAD',
      rate: 1.3862,
    },
    {
      date: '2026-10-01',
      from_currency: 'CAD',
      to_currency: 'COP',
      rate: 3000,
    },
  ];

  it('writes the rates oldest first under the import header', () => {
    expect(formatExchangeRatesCsv(rates).split(/\r?\n/)).toEqual([
      'date,from,to,rate',
      '2026-10-01,CAD,COP,3000',
      '2026-10-01,USD,CAD,1.3862',
      '2026-10-02,USD,CAD,1.39',
      '',
    ]);
  });

  it('can be imported again', () => {
    const { rates: parsed, errors } = parseExchangeRatesCsv(
      formatExchangeRatesCsv(rates),
    );
    expect(errors).toEqual([]);
    expect(parsed.map(({ line: _line, ...rate }) => rate)).toEqual(
      expect.arrayContaining(rates),
    );
    expect(parsed).toHaveLength(rates.length);
  });

  it.each([
    [1e-8, '0.00000001'],
    [5e-7, '0.0000005'],
    [1.23456789e-9, '0.00000000123456789'],
    [0.000001, '0.000001'],
  ])('writes a rate of %s as %s, which can be imported again', (rate, text) => {
    const csv = formatExchangeRatesCsv([
      { date: '2026-10-01', from_currency: 'COP', to_currency: 'BTC', rate },
    ]);

    expect(csv.split(/\r?\n/)[1]).toBe(`2026-10-01,COP,BTC,${text}`);
    const { rates: parsed, errors } = parseExchangeRatesCsv(csv);
    expect(errors).toEqual([]);
    expect(parsed[0].rate).toBe(rate);
  });
});

describe('parseExchangeRatesCsv', () => {
  it('reads rates with a header in any order', () => {
    const { rates, errors } = parseExchangeRatesCsv(
      'rate,date,to,from\n1.3862,2026-10-01,CAD,USD\n3000,2026-10-02,cop,cad\n',
    );

    expect(errors).toEqual([]);
    expect(rates).toEqual([
      {
        line: 2,
        date: '2026-10-01',
        from_currency: 'USD',
        to_currency: 'CAD',
        rate: 1.3862,
      },
      {
        line: 3,
        date: '2026-10-02',
        from_currency: 'CAD',
        to_currency: 'COP',
        rate: 3000,
      },
    ]);
  });

  it('accepts semicolons with decimal commas, tabs and alternative names', () => {
    expect(
      parseExchangeRatesCsv(
        '﻿Date;Base;Quote;Rate\r\n2026-10-01;USD;CAD;1,3862\r\n',
      ).rates[0],
    ).toMatchObject({ from_currency: 'USD', to_currency: 'CAD', rate: 1.3862 });

    expect(
      parseExchangeRatesCsv(
        'date\tfrom_currency\tto_currency\trate\n2026-10-01\tEUR\tCAD\t1.5\n',
      ).rates[0],
    ).toMatchObject({ from_currency: 'EUR', rate: 1.5 });
  });

  it('reports invalid rows with their line and keeps the others', () => {
    const { rates, errors } = parseExchangeRatesCsv(
      'date,from,to,rate\n10/01/2026,USD,CAD,1.38\n2026-10-02,USD,CAD,abc\n2026-10-03,USD,CAD,1.39\n',
    );

    expect(rates.map(rate => rate.line)).toEqual([4]);
    expect(errors).toEqual([
      { line: 2, message: 'Invalid date "10/01/2026" (use YYYY-MM-DD)' },
      {
        line: 3,
        message:
          'Invalid rate "abc" (use a number like 1.3862, without thousands separators)',
      },
    ]);
  });

  it('counts blank lines in the line numbers', () => {
    const { errors } = parseExchangeRatesCsv(
      'date,from,to,rate\n\n2026-10-01,USD,CAD,1.38\n\n2026-10-02,USD,CAD,abc\n',
    );

    expect(errors).toEqual([
      { line: 5, message: expect.stringMatching(/^Invalid rate "abc"/) },
    ]);
  });

  it('ignores a byte order mark before the header', () => {
    const { rates, errors } = parseExchangeRatesCsv(
      '﻿date,from,to,rate\r\n2026-10-01,USD,CAD,1.38\r\n',
    );

    expect(errors).toEqual([]);
    expect(rates).toHaveLength(1);
  });

  it('requires all columns in the header', () => {
    const { rates, errors } = parseExchangeRatesCsv(
      'date,from,rate\n2026-10-01,USD,1.38\n',
    );

    expect(rates).toEqual([]);
    expect(errors[0].message).toMatch(/"to" is missing/);
  });

  it('reports an empty file', () => {
    expect(parseExchangeRatesCsv('').errors).toEqual([
      { line: 1, message: 'The file is empty' },
    ]);
  });

  it('reports rows with more or fewer values than the header', () => {
    const { rates, errors } = parseExchangeRatesCsv(
      'date,from,to,rate\n2026-10-01,USD,CAD,1,38\n2026-10-02,USD,CAD\n2026-10-03,USD,CAD,1.39\n',
    );

    expect(rates.map(rate => rate.line)).toEqual([4]);
    expect(errors).toEqual([
      { line: 2, message: 'The row has 5 values but the header has 4' },
      { line: 3, message: 'The row has 3 values but the header has 4' },
    ]);
  });

  it.each(['0x10', '1e3', '1.5e2', 'Infinity', '-1.38', '.5', '1.', '1,38'])(
    'rejects the rate %s in a comma-separated file',
    rateText => {
      const { rates, errors } = parseExchangeRatesCsv(
        `date,from,to,rate\n2026-10-01,USD,CAD,"${rateText}"\n`,
      );

      expect(rates).toEqual([]);
      expect(errors).toEqual([
        {
          line: 2,
          message: `Invalid rate "${rateText}" (use a number like 1.3862, without thousands separators)`,
        },
      ]);
    },
  );

  it.each(['3,000', '15,800', '1,234.56'])(
    'rejects the thousands-grouped rate %s instead of reading part of it',
    rateText => {
      const { rates, errors } = parseExchangeRatesCsv(
        `date,from,to,rate\n2026-10-01,CAD,COP,"${rateText}"\n`,
      );

      expect(rates).toEqual([]);
      expect(errors[0].message).toMatch(/without thousands separators/);
    },
  );

  it.each([
    ['semicolons', ';'],
    ['tabs', '\t'],
  ])('reads decimal commas when values are separated by %s', (_, separator) => {
    const { rates, errors } = parseExchangeRatesCsv(
      [
        ['date', 'from', 'to', 'rate'],
        ['2026-10-01', 'USD', 'CAD', ' 1,3862 '],
        ['2026-10-02', 'USD', 'CAD', '1.39'],
        ['2026-10-03', 'USD', 'CAD', '1.234,5'],
      ]
        .map(row => row.join(separator))
        .join('\n'),
    );

    expect(rates.map(rate => rate.rate)).toEqual([1.3862, 1.39]);
    expect(errors).toEqual([
      {
        line: 4,
        message:
          'Invalid rate "1.234,5" (use a number like 1.3862 or 1,3862, without thousands separators)',
      },
    ]);
  });

  it('ignores separators inside quoted header names', () => {
    const { rates, errors } = parseExchangeRatesCsv(
      'date,from,to,rate,"note; source"\n2026-10-01,USD,CAD,1.38,ECB\n',
    );
    expect(errors).toEqual([]);
    expect(rates).toEqual([
      {
        line: 2,
        date: '2026-10-01',
        from_currency: 'USD',
        to_currency: 'CAD',
        rate: 1.38,
      },
    ]);

    const quoted = parseExchangeRatesCsv(
      '"date","from","to","rate"\n"2026-10-01","USD","CAD","1.38"\n',
    );
    expect(quoted.errors).toEqual([]);
    expect(quoted.rates[0]).toMatchObject({ rate: 1.38 });
  });
});
