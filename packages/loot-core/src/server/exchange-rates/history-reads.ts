import { stringify } from 'csv-stringify/sync';

import type { SqlParam } from '#platform/server/sqlite/types';
import * as db from '#server/db';
import { exchangeRateModel } from '#server/models';
import { runMutator } from '#server/mutators';
import { withUndo } from '#server/undo';
import { isReviewedCurrency } from '#shared/amount-encoding';
import { isValidDate, utcEndOfDay, utcMidnight } from '#shared/exchange-rate';
import type { ExchangeRateEntity } from '#types/models';
import type {
  HistoryFilter,
  HistoryRow,
} from '#types/models/exchange-rate-history';

import {
  captureFxContext,
  isFxCaptureActive,
  isFxContextCurrent,
} from './context';
import {
  decodeHistoryCursor,
  decodeStoredText,
  encodeHistoryCursor,
} from './history-codec';
import type { HistoryBoundary } from './history-codec';

type Superseded = { status: 'superseded' };
type FilterError = { status: 'error'; code: 'filter-invalid' };
type PageResult =
  | Superseded
  | FilterError
  | { status: 'error'; code: 'cursor-invalid' }
  | {
      status: 'ok';
      context: string;
      rows: HistoryRow[];
      nextCursor: string | null;
      invalidCount: number;
      unpageableCount?: number;
    };
type ExportResult =
  | Superseded
  | FilterError
  | {
      status: 'ok';
      context: string;
      filename: string;
      csv: string;
      rowCount: number;
      omittedCount: number;
    };
type RemoveResult = Superseded | { status: 'removed' | 'missing' | 'stale' };
type RawRow = ExchangeRateEntity & {
  quote_bytes: Uint8Array;
  timestamp_bytes: Uint8Array;
  id_bytes: Uint8Array;
};
const byteColumns: Array<[string, number]> = [
  ['quote_currency', 16],
  ['timestamp', 64],
  ['id', 256],
];
const domain = byteColumns
  .map(
    ([column, bound]) =>
      `(typeof(${column}) = 'text' AND instr(CAST(${column} AS BLOB), x'00') = 0 AND length(CAST(${column} AS BLOB)) BETWEEN 1 AND ${bound})`,
  )
  .join(' AND ');
const quoteBytes = 'CAST(quote_currency AS BLOB)';
const timeBytes = 'CAST(timestamp AS BLOB)';
const idBytes = 'CAST(id AS BLOB)';

function filterQuery(
  filter: HistoryFilter,
  base: string,
): { sql: string; params: SqlParam[] } | null {
  if (
    !filter ||
    (filter.quoteCurrency !== undefined &&
      (!isReviewedCurrency(filter.quoteCurrency) ||
        filter.quoteCurrency === base)) ||
    (filter.kind !== undefined &&
      filter.kind !== 'dated' &&
      filter.kind !== 'standing' &&
      filter.kind !== 'fetched') ||
    (filter.from !== undefined && !isValidDate(filter.from)) ||
    (filter.to !== undefined && !isValidDate(filter.to)) ||
    (filter.from !== undefined &&
      filter.to !== undefined &&
      filter.from > filter.to)
  ) {
    return null;
  }
  const parts = ['base_currency = ?', 'tombstone = 0'];
  const params: SqlParam[] = [base];
  if (filter.quoteCurrency !== undefined) {
    parts.push('quote_currency = ?');
    params.push(filter.quoteCurrency);
  }
  if (filter.kind !== undefined) {
    parts.push('kind = ?');
    params.push(filter.kind);
  }
  if (filter.from !== undefined) {
    parts.push('timestamp >= ?');
    params.push(utcMidnight(filter.from));
  }
  if (filter.to !== undefined) {
    parts.push('timestamp <= ?');
    params.push(utcEndOfDay(filter.to));
  }
  return { sql: parts.join(' AND '), params };
}

/** Importable days and formula-safe provenance are stricter than the synced model. */
function validRow(row: ExchangeRateEntity): boolean {
  try {
    exchangeRateModel.validate(row);
    return (
      /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(row.timestamp) &&
      isValidDate(row.timestamp.slice(0, 10)) &&
      (row.source === 'manual' ||
        /^plugin:[a-z0-9][a-z0-9-]{0,39}$/.test(row.source))
    );
  } catch {
    return false;
  }
}
function boundary(row: RawRow): HistoryBoundary {
  return [row.quote_bytes, row.timestamp_bytes, row.id_bytes];
}
function displayRow(raw: RawRow): HistoryRow | null {
  const quote = decodeStoredText(raw.quote_bytes);
  const timestamp = decodeStoredText(raw.timestamp_bytes);
  const id = decodeStoredText(raw.id_bytes);
  if (quote === null || timestamp === null || id === null) return null;
  const row = { ...raw, quote_currency: quote, timestamp, id };
  if (!validRow(row)) return null;
  return {
    id,
    quote_currency: quote,
    rate: row.rate,
    kind: row.kind,
    source: row.source,
    timestamp,
  };
}

export async function historyPage(
  filter: HistoryFilter & { cursor?: string; limit?: number },
): Promise<PageResult> {
  const captured = await captureFxContext();
  if (!captured) return { status: 'superseded' };
  const query = filterQuery(filter, captured.baseCurrency);
  if (
    !query ||
    (filter.limit !== undefined &&
      (!Number.isSafeInteger(filter.limit) || filter.limit < 1))
  ) {
    return { status: 'error', code: 'filter-invalid' };
  }
  const limit = Math.min(filter.limit ?? 100, 500);
  const cursor =
    filter.cursor === undefined ? null : decodeHistoryCursor(filter.cursor);
  if (filter.cursor !== undefined && !cursor) {
    return { status: 'error', code: 'cursor-invalid' };
  }
  let unpageableCount: number | undefined;
  if (filter.cursor === undefined) {
    unpageableCount =
      db.firstSync<{ count: number }>(
        `SELECT count(*) AS count FROM exchange_rates WHERE ${query.sql} AND NOT (${domain})`,
        query.params,
      )?.count ?? 0;
  }
  const seek = cursor
    ? `AND (${quoteBytes} > ? OR (${quoteBytes} = ? AND (${timeBytes} < ? OR (${timeBytes} = ? AND ${idBytes} > ?))))`
    : '';
  const params: SqlParam[] = [...query.params];
  if (cursor) {
    params.push(cursor[0], cursor[0], cursor[1], cursor[1], cursor[2]);
  }
  params.push(limit);
  const raw = db.runQuery<RawRow>(
    `SELECT *, ${quoteBytes} AS quote_bytes, ${timeBytes} AS timestamp_bytes, ${idBytes} AS id_bytes
    FROM exchange_rates WHERE ${query.sql} AND ${domain} ${seek}
    ORDER BY ${quoteBytes} ASC, ${timeBytes} DESC, ${idBytes} ASC LIMIT ?`,
    params,
    true,
  );
  const rows: HistoryRow[] = [];
  let invalidCount = 0;
  for (const candidate of raw) {
    const row = displayRow(candidate);
    if (row) rows.push(row);
    else invalidCount++;
  }
  const nextCursor =
    raw.length === limit
      ? encodeHistoryCursor(boundary(raw[raw.length - 1]))
      : null;
  if (!(await isFxContextCurrent(captured)) || !isFxCaptureActive(captured)) {
    return { status: 'superseded' };
  }
  return {
    status: 'ok',
    context: captured.context,
    rows,
    nextCursor,
    invalidCount,
    ...(unpageableCount !== undefined ? { unpageableCount } : {}),
  };
}

export async function historyExport(
  filter: HistoryFilter,
): Promise<ExportResult> {
  const captured = await captureFxContext();
  if (!captured) return { status: 'superseded' };
  const query = filterQuery(filter, captured.baseCurrency);
  if (!query) return { status: 'error', code: 'filter-invalid' };
  const raw = db.runQuery<ExchangeRateEntity>(
    `SELECT * FROM exchange_rates WHERE ${query.sql}
    ORDER BY quote_currency ASC, timestamp ASC, kind ASC, source ASC, id ASC`,
    query.params,
    true,
  );
  const rows = raw.filter(validRow);
  const columns = [
    'base_currency',
    'quote_currency',
    'rate',
    'kind',
    'date',
    'source',
    'timestamp',
  ];
  const csv = stringify(
    rows.map(row => ({
      base_currency: row.base_currency,
      quote_currency: row.quote_currency,
      rate: row.rate,
      kind: row.kind,
      date: row.timestamp.slice(0, 10),
      source: row.source,
      timestamp: row.timestamp,
    })),
    { header: true, columns, record_delimiter: '\n' },
  );
  if (!(await isFxContextCurrent(captured)) || !isFxCaptureActive(captured)) {
    return { status: 'superseded' };
  }
  return {
    status: 'ok',
    context: captured.context,
    filename: `exchange-rates-${captured.baseCurrency}-${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
    rowCount: rows.length,
    omittedCount: raw.length - rows.length,
  };
}

export async function removeFetched({
  id,
  context,
  reviewed,
}: {
  id: string;
  context: string;
  reviewed: { rate: string; source: string; timestamp: string };
}): Promise<RemoveResult> {
  const captured = await captureFxContext();
  if (!captured || captured.context !== context) {
    return { status: 'superseded' };
  }
  return runMutator(async (): Promise<RemoveResult> => {
    if (!(await isFxContextCurrent(captured)) || !isFxCaptureActive(captured)) {
      return { status: 'superseded' };
    }
    const row = db.firstSync<ExchangeRateEntity>(
      'SELECT * FROM exchange_rates WHERE id = ?',
      [id],
    );
    if (
      !row ||
      row.tombstone ||
      row.kind !== 'fetched' ||
      row.base_currency !== captured.baseCurrency
    ) {
      return { status: 'missing' };
    }
    if (
      !reviewed ||
      row.rate !== reviewed.rate ||
      row.source !== reviewed.source ||
      row.timestamp !== reviewed.timestamp
    ) {
      return { status: 'stale' };
    }
    await withUndo(() => db.update('exchange_rates', { id, tombstone: 1 }));
    return { status: 'removed' };
  });
}
