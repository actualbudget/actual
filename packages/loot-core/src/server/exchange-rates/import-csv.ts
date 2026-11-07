import { parse } from 'csv-parse/sync';

import { isReviewedCurrency } from '#shared/amount-encoding';
import { isValidDate, parseRate } from '#shared/exchange-rate';
import type {
  ImportFileError,
  ImportPreviewRow,
  ImportRowError,
} from '#types/models/exchange-rate-history';

export type ParsedImportRow = ImportPreviewRow & {
  value?: {
    quoteCurrency: string;
    rate: string;
    kind: 'standing' | 'dated';
    date: string;
  };
};
export type ParsedImport =
  | { status: 'ok'; rows: ParsedImportRow[]; ignoredColumns: string[] }
  | ImportFileError;
type RequiredColumn = 'quote_currency' | 'rate' | 'kind' | 'date';
type RecognizedColumn = RequiredColumn | 'base_currency';
const required: RequiredColumn[] = ['quote_currency', 'rate', 'kind', 'date'];
const recognized: RecognizedColumn[] = [...required, 'base_currency'];

/** File BOMs are format markers. Database-field decoding preserves BOM characters. */
export function parseRateCsv(
  bytes: Uint8Array,
  baseCurrency: string,
): ParsedImport {
  if (bytes.byteLength > 5 * 1024 * 1024) {
    return { status: 'error', code: 'file-too-large' };
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { status: 'error', code: 'invalid-encoding' };
  }
  let records: string[][];
  const lines: number[] = [];
  try {
    records = parse(text, {
      bom: true,
      delimiter: ',',
      quote: '"',
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
      max_record_size: 4096,
      on_record(record, info) {
        lines.push(info.lines);
        return record;
      },
    });
  } catch {
    return { status: 'error', code: 'parse-failed' };
  }
  if (records.length < 2) return { status: 'error', code: 'empty-file' };
  if (records.length > 20001) return { status: 'error', code: 'too-many-rows' };
  const header = records[0].map(cell => cell.trim().toLowerCase());
  for (const column of recognized) {
    if (header.filter(cell => cell === column).length > 1) {
      return { status: 'error', code: 'duplicate-column', column };
    }
  }
  for (const column of required) {
    if (!header.includes(column)) {
      return { status: 'error', code: 'missing-column', column };
    }
  }
  const index = (column: RecognizedColumn) => header.indexOf(column);
  const ignoredColumns = header.filter(
    cell => !recognized.some(column => column === cell),
  );
  const rows: ParsedImportRow[] = [];
  const groups = new Map<string, ParsedImportRow[]>();
  for (let n = 1; n < records.length; n++) {
    const cells = records[n];
    const raw = (column: RecognizedColumn) =>
      cells[index(column)]?.trim() ?? '';
    const quote = raw('quote_currency').toUpperCase();
    const rate = raw('rate');
    const kind = raw('kind');
    const date = raw('date');
    const row: ParsedImportRow = {
      line: lines[n],
      class: 'new',
      quote: quote.slice(0, 64),
      rate: rate.slice(0, 64),
      kind: kind.slice(0, 64),
      date: date.slice(0, 64),
    };
    rows.push(row);
    const invalid = (error: ImportRowError) => {
      row.class = 'invalid';
      row.error = error;
    };
    if (cells.length !== header.length) {
      invalid('column-count');
      continue;
    }
    if (cells.some(cell => cell.length > 64)) {
      invalid('cell-too-long');
      continue;
    }
    if (kind === 'fetched') {
      row.class = 'skipped-fetched';
      continue;
    }
    if (!isReviewedCurrency(quote) || quote === baseCurrency) {
      invalid('invalid-currency');
      continue;
    }
    if (index('base_currency') >= 0 && raw('base_currency') !== baseCurrency) {
      invalid('invalid-base');
      continue;
    }
    let canonical: string;
    try {
      canonical = parseRate(rate);
    } catch {
      invalid('invalid-rate');
      continue;
    }
    if (kind !== 'standing' && kind !== 'dated') {
      invalid('invalid-kind');
      continue;
    }
    if (!isValidDate(date)) {
      invalid('invalid-date');
      continue;
    }
    row.rate = canonical;
    row.value = { quoteCurrency: quote, rate: canonical, kind, date };
    const key = JSON.stringify([quote, kind, date]);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (new Set(group.map(row => row.rate)).size > 1) {
      for (const row of group) row.class = 'conflict-in-file';
    } else {
      for (const row of group.slice(1)) row.class = 'duplicate-in-file';
    }
  }
  return { status: 'ok', rows, ignoredColumns };
}
