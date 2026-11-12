import { parse as parseCsv } from 'csv-parse/sync';
import { stringify as stringifyCsv } from 'csv-stringify/sync';

import type { ExchangeRateEntity } from '#types/models';

export type ParsedExchangeRate = Pick<
  ExchangeRateEntity,
  'from_currency' | 'to_currency' | 'rate' | 'date'
>;

export type ExchangeRateImportError = {
  // 1-based line number in the file
  line: number;
  message: string;
};

const COLUMN_NAMES: Record<keyof ParsedExchangeRate, string[]> = {
  date: ['date'],
  from_currency: ['from', 'from_currency', 'base'],
  to_currency: ['to', 'to_currency', 'quote'],
  rate: ['rate'],
};

// Parses a CSV file of exchange rates with a header row naming the columns
// `date`, `from`, `to` and `rate`, in any order, e.g.
//
//   date,from,to,rate
//   2026-10-01,USD,CAD,1.3862
//
// Values may be separated by commas, semicolons or tabs. Rates are plain
// decimal numbers without thousands separators; their decimal mark is a
// dot, or a comma when values are separated by semicolons or tabs. Rows are
// only checked for shape here; the rates themselves are validated when
// saved.
export function parseExchangeRatesCsv(contents: string): {
  rates: Array<ParsedExchangeRate & { line: number }>;
  errors: ExchangeRateImportError[];
} {
  // The header decides the separator, so a decimal comma in a
  // semicolon-separated file stays part of the rate. Quoted names are left
  // out, so a semicolon inside one doesn't change the separator.
  const headerLine = (contents.split(/\r?\n/, 1)[0] ?? '').replace(
    /"(?:[^"]|"")*"/g,
    '',
  );
  const delimiter = headerLine.includes(';')
    ? ';'
    : headerLine.includes('\t')
      ? '\t'
      : ',';
  // A comma is only a decimal mark when it can't separate values, so
  // "3,000" in a comma-separated file is never read as 3
  const ratePattern = delimiter === ',' ? /^\d+(\.\d+)?$/ : /^\d+([.,]\d+)?$/;
  const rateExample = delimiter === ',' ? '1.3862' : '1.3862 or 1,3862';

  let rows: Array<{ record: string[]; info: { lines: number } }>;
  try {
    rows = parseCsv(contents, {
      bom: true,
      delimiter,
      // Each row comes with the line it ends on, so errors point at the
      // right line even after blank ones
      info: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      // The library's types don't model the shape `info` gives each row
    }) as unknown as typeof rows;
  } catch (err) {
    return {
      rates: [],
      errors: [
        {
          line: 1,
          message: `Could not read the file: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }

  const [header, ...dataRows] = rows;
  if (!header) {
    return { rates: [], errors: [{ line: 1, message: 'The file is empty' }] };
  }

  const normalizedHeader = header.record.map(name => name.toLowerCase());
  const columnIndex = {} as Record<keyof ParsedExchangeRate, number>;
  for (const [field, names] of Object.entries(COLUMN_NAMES) as Array<
    [keyof ParsedExchangeRate, string[]]
  >) {
    const index = normalizedHeader.findIndex(name => names.includes(name));
    if (index === -1) {
      return {
        rates: [],
        errors: [
          {
            line: 1,
            message: `The header must name the columns date, from, to and rate; "${names[0]}" is missing`,
          },
        ],
      };
    }
    columnIndex[field] = index;
  }

  const rates: Array<ParsedExchangeRate & { line: number }> = [];
  const errors: ExchangeRateImportError[] = [];

  dataRows.forEach(({ record: row, info: { lines: line } }) => {
    // A row with more values than the header usually has an unquoted
    // decimal comma, e.g. 1,38 read as a rate of 1
    if (row.length !== header.record.length) {
      errors.push({
        line,
        message: `The row has ${row.length} values but the header has ${header.record.length}`,
      });
      return;
    }

    const date = row[columnIndex.date];
    const rateText = row[columnIndex.rate].trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({ line, message: `Invalid date "${date}" (use YYYY-MM-DD)` });
      return;
    }
    if (!ratePattern.test(rateText)) {
      errors.push({
        line,
        message: `Invalid rate "${rateText}" (use a number like ${rateExample}, without thousands separators)`,
      });
      return;
    }

    rates.push({
      line,
      date,
      from_currency: row[columnIndex.from_currency].toUpperCase(),
      to_currency: row[columnIndex.to_currency].toUpperCase(),
      rate: Number(rateText.replace(',', '.')),
    });
  });

  return { rates, errors };
}

// A rate as plain decimal text: `String` writes rates below 0.000001 like
// 1e-7, which `parseExchangeRatesCsv` doesn't read. The digits are moved,
// not recomputed, so the rate is written exactly.
function formatRate(rate: number): string {
  const text = String(rate);
  const exponential = /^(\d)(?:\.(\d+))?e-(\d+)$/.exec(text);
  if (!exponential) {
    return text;
  }
  const [, digit, decimals = '', exponent] = exponential;
  return `0.${'0'.repeat(Number(exponent) - 1)}${digit}${decimals}`;
}

// Writes rates in the format `parseExchangeRatesCsv` reads, oldest first
export function formatExchangeRatesCsv(
  rates: readonly ParsedExchangeRate[],
): string {
  const sorted = [...rates].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.from_currency.localeCompare(b.from_currency) ||
      a.to_currency.localeCompare(b.to_currency),
  );
  return stringifyCsv(
    sorted.map(rate => [
      rate.date,
      rate.from_currency,
      rate.to_currency,
      formatRate(rate.rate),
    ]),
    { header: true, columns: ['date', 'from', 'to', 'rate'] },
  );
}
