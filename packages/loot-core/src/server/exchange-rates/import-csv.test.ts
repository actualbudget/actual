import { parseRateCsv } from './import-csv';

const header = 'quote_currency,rate,kind,date\n';
function parse(text: string) {
  return parseRateCsv(new TextEncoder().encode(text), 'USD');
}
function rows(text: string) {
  const result = parse(header + text);
  if (result.status !== 'ok') {
    throw new Error(`expected parsed file: ${JSON.stringify(result)}`);
  }
  return result.rows;
}

it.each([
  { text: 'EUR,0.92,standing,2026-02-28', quote: 'EUR', rate: '0.92' },
  { text: 'eur ,0.9200,standing,2026-02-27', quote: 'EUR', rate: '0.92' },
  { text: 'JPY,150.000,standing,2026-02-28', quote: 'JPY', rate: '150' },
  { text: 'KWD,0.307,standing,2026-02-28', quote: 'KWD', rate: '0.307' },
  {
    text: 'EUR,0.123456789012345,standing,2026-02-28',
    quote: 'EUR',
    rate: '0.123456789012345',
  },
])('normalizes valid manual rate input: $text', ({ text, quote, rate }) => {
  expect(rows(text)).toMatchObject([
    {
      line: 2,
      class: 'new',
      quote,
      rate,
      value: { quoteCurrency: quote, rate },
    },
  ]);
});

it.each([
  { text: 'EUR,"1,05",standing,2026-02-26', error: 'invalid-rate' },
  ...['1e-3', '0', '-0.5', '+0.5', '0.1234567890123456'].map(rate => ({
    text: `EUR,${rate},standing,2026-02-28`,
    error: 'invalid-rate',
  })),
  { text: 'EUR,0.92,daily,2026-02-28', error: 'invalid-kind' },
  ...['2026-02-30', '28/02/2026'].map(date => ({
    text: `EUR,0.92,standing,${date}`,
    error: 'invalid-date',
  })),
  ...['USD', 'XXX', '"=HYPERLINK(""x"")"'].map(quote => ({
    text: `${quote},1,standing,2026-02-28`,
    error: 'invalid-currency',
  })),
  { text: 'EUR,0.92,standing,2026-02-28,extra', error: 'column-count' },
  {
    text: `${'X'.repeat(65)},0.92,standing,2026-02-28`,
    error: 'cell-too-long',
  },
])(
  'classifies an invalid row without accepting its values: $text',
  ({ text, error }) => {
    expect(rows(text)).toMatchObject([{ class: 'invalid', error }]);
  },
);

it('keeps strict quote parsing and suppresses parser exception text', () => {
  expect(parse(header + '=HYPERLINK("x"),1,standing,2026-02-28')).toEqual({
    status: 'error',
    code: 'parse-failed',
  });
});
it('strips a file BOM and handles CRLF and blank lines', () => {
  expect(
    parse(
      '\uFEFF' +
        header.replaceAll('\n', '\r\n') +
        '\r\nEUR,0.92,standing,2026-02-28\r\n',
    ),
  ).toMatchObject({ status: 'ok', rows: [{ class: 'new', quote: 'EUR' }] });
});
it('rejects invalid UTF-8 and oversized bytes before parsing', () => {
  expect(parseRateCsv(Uint8Array.of(255, 254), 'USD')).toEqual({
    status: 'error',
    code: 'invalid-encoding',
  });
  expect(parseRateCsv(new Uint8Array(5 * 1024 * 1024 + 1), 'USD')).toEqual({
    status: 'error',
    code: 'file-too-large',
  });
});
it('rejects over 20000 rows before classifying any row', () => {
  expect(
    parse(header + 'EUR,0.92,standing,2026-02-28\n'.repeat(20001)),
  ).toEqual({ status: 'error', code: 'too-many-rows' });
});
it.each([
  {
    text: 'quote_currency,kind,date\nEUR,standing,2026-02-28',
    code: 'missing-column',
    column: 'rate',
  },
  {
    text: 'quote_currency,rate, RATE ,kind,date\nEUR,1,1,standing,2026-02-28',
    code: 'duplicate-column',
    column: 'rate',
  },
  {
    text: 'base_currency, BASE_CURRENCY ,quote_currency,rate,kind,date\nUSD,USD,EUR,1,standing,2026-02-28',
    code: 'duplicate-column',
    column: 'base_currency',
  },
])('validates normalized header names: $code', ({ text, code, column }) => {
  expect(parse(text)).toEqual({ status: 'error', code, column });
});
it.each(['', header])('rejects an empty file: %j', text => {
  expect(parse(text)).toEqual({ status: 'error', code: 'empty-file' });
});
it('checks optional base currency and skips fetched rows from an export', () => {
  expect(
    parse(
      'base_currency,quote_currency,rate,kind,date\nGBP,EUR,0.92,standing,2026-02-28',
    ),
  ).toMatchObject({
    status: 'ok',
    rows: [{ class: 'invalid', error: 'invalid-base' }],
  });
  expect(
    parse(
      'base_currency,quote_currency,rate,kind,date,source,timestamp\nUSD,EUR,0.91,fetched,2026-02-25,plugin:fxtest,2026-02-25T00:00:00.000Z',
    ),
  ).toMatchObject({
    status: 'ok',
    ignoredColumns: ['source', 'timestamp'],
    rows: [{ class: 'skipped-fetched' }],
  });
});
it('distinguishes duplicate rates, conflicting keys and different kinds', () => {
  expect(
    rows('EUR,0.92,standing,2026-02-28\nEUR,0.9200,standing,2026-02-28').map(
      row => row.class,
    ),
  ).toEqual(['new', 'duplicate-in-file']);
  expect(
    rows(
      'EUR,0.92,standing,2026-02-28\nEUR,0.93,standing,2026-02-28\nEUR,0.92,standing,2026-02-28',
    ).map(row => row.class),
  ).toEqual(['conflict-in-file', 'conflict-in-file', 'conflict-in-file']);
  expect(
    rows('EUR,0.92,standing,2026-02-28\nEUR,0.92,dated,2026-02-28').map(
      row => row.class,
    ),
  ).toEqual(['new', 'new']);
});
