import * as fs from '#platform/server/fs';
import * as db from '#server/db';
import { runMutator } from '#server/mutators';
import { batchMessages } from '#server/sync';
import { withUndo } from '#server/undo';
import { utcMidnight } from '#shared/exchange-rate';
import type { ExchangeRateEntity } from '#types/models';
import type {
  ImportFileError,
  ImportPreviewRow,
  ImportRowClass,
} from '#types/models/exchange-rate-history';

import { exchangeRateId, writeManualRate } from './app';
import {
  captureFxContext,
  isFxCaptureActive,
  isFxContextCurrent,
  onFxContextChanged,
} from './context';
import type { FxCapture } from './context';
import { parseRateCsv } from './import-csv';
import type { ParsedImportRow } from './import-csv';

export { historyExport, historyPage, removeFetched } from './history-reads';
export { backfillCancel, backfillPlan, backfillStart } from './backfill';

type Fingerprint = Pick<
  ExchangeRateEntity,
  | 'base_currency'
  | 'quote_currency'
  | 'rate'
  | 'kind'
  | 'source'
  | 'timestamp'
  | 'tombstone'
  | 'spec'
>;
type ImportPlan = {
  rows: ParsedImportRow[];
  fingerprints: Map<string, Fingerprint | null>;
};
type Authority = {
  operation: number;
  state: 'reserved' | 'reading' | 'ready';
  captured: FxCapture;
  plan?: ImportPlan;
};
let nextOperation = 0;
let authority: Authority | null = null;
onFxContextChanged(() => {
  authority = null;
});

type Superseded = { status: 'superseded' };
type PreviewBeginResult =
  | { status: 'ok'; context: string; operation: number }
  | Superseded;
type PreviewResult =
  | ImportFileError
  | Superseded
  | {
      status: 'ok';
      context: string;
      operation: number;
      counts: Record<ImportRowClass, number>;
      ignoredColumns: string[];
      rows: ImportPreviewRow[];
    };
type CommitResult =
  | Superseded
  | { status: 'error'; code: 'preview-not-found' | 'stale-preview' }
  | { status: 'ok'; written: number; replaced: number; kept: number };

function readRow(id: string) {
  return db.firstSync<ExchangeRateEntity>(
    'SELECT * FROM exchange_rates WHERE id = ?',
    [id],
  );
}
function fingerprint(row: ExchangeRateEntity | null): Fingerprint | null {
  if (!row) return null;
  return {
    base_currency: row.base_currency,
    quote_currency: row.quote_currency,
    rate: row.rate,
    kind: row.kind,
    source: row.source,
    timestamp: row.timestamp,
    tombstone: row.tombstone,
    spec: row.spec,
  };
}
function rowKey(base: string, value: NonNullable<ParsedImportRow['value']>) {
  return exchangeRateId(
    base,
    value.quoteCurrency,
    'manual',
    value.kind,
    utcMidnight(value.date),
  );
}
function matchesKey(
  base: string,
  value: NonNullable<ParsedImportRow['value']>,
  row: Fingerprint,
) {
  return (
    row.base_currency === base &&
    row.quote_currency === value.quoteCurrency &&
    row.source === 'manual' &&
    row.kind === value.kind &&
    row.timestamp === utcMidnight(value.date)
  );
}

/** Reserves authority before a path can be sent or a read can start. */
export async function importPreviewBegin(): Promise<PreviewBeginResult> {
  const captured = await captureFxContext();
  if (
    !captured ||
    !isFxCaptureActive(captured) ||
    nextOperation >= Number.MAX_SAFE_INTEGER
  ) {
    return { status: 'superseded' };
  }
  const operation = ++nextOperation;
  authority = { operation, state: 'reserved', captured };
  return { status: 'ok', context: captured.context, operation };
}
export async function importCancel({
  operation,
}: {
  operation: number;
}): Promise<void> {
  if (authority?.operation === operation) authority = null;
}

export async function importPreview({
  operation,
  filepath,
}: {
  operation: number;
  filepath: string;
}): Promise<PreviewResult> {
  const current = authority;
  if (
    !current ||
    current.operation !== operation ||
    current.state !== 'reserved'
  ) {
    return { status: 'superseded' };
  }
  current.state = 'reading';
  const valid = async () =>
    authority === current &&
    current.state === 'reading' &&
    (await isFxContextCurrent(current.captured)) &&
    authority === current;
  const fail = async (error: ImportFileError): Promise<PreviewResult> => {
    if (!(await valid())) return { status: 'superseded' };
    authority = null;
    return error;
  };
  if (!(await valid())) return { status: 'superseded' };
  if (typeof filepath !== 'string' || !/\.csv$/i.test(filepath)) {
    return fail({ status: 'error', code: 'file-unreadable' });
  }
  let bytes: Uint8Array;
  try {
    bytes = await fs.readFile(filepath, 'binary');
  } catch {
    return fail({ status: 'error', code: 'file-unreadable' });
  }
  if (!(await valid())) return { status: 'superseded' };
  const parsed = parseRateCsv(bytes, current.captured.baseCurrency);
  if (parsed.status === 'error') return fail(parsed);
  const fingerprints = new Map<string, Fingerprint | null>();
  for (const row of parsed.rows) {
    if (!row.value) continue;
    const id = rowKey(current.captured.baseCurrency, row.value);
    if (!fingerprints.has(id)) fingerprints.set(id, fingerprint(readRow(id)));
    const existing = fingerprints.get(id) ?? null;
    if (
      existing &&
      !matchesKey(current.captured.baseCurrency, row.value, existing)
    ) {
      row.class = 'invalid';
      row.error = 'key-mismatch';
    } else if (row.class === 'new' && existing && !existing.tombstone) {
      row.class = existing.rate === row.value.rate ? 'unchanged' : 'conflict';
      row.existingRate =
        typeof existing.rate === 'string' ? existing.rate.slice(0, 64) : '';
    }
  }
  if (!(await valid())) return { status: 'superseded' };
  if (authority !== current || !isFxCaptureActive(current.captured)) {
    return { status: 'superseded' };
  }
  current.plan = { rows: parsed.rows, fingerprints };
  current.state = 'ready';
  const counts: Record<ImportRowClass, number> = {
    new: 0,
    unchanged: 0,
    conflict: 0,
    'duplicate-in-file': 0,
    'conflict-in-file': 0,
    'skipped-fetched': 0,
    invalid: 0,
  };
  for (const row of parsed.rows) counts[row.class]++;
  const rows = parsed.rows
    .filter(row => row.class !== 'new')
    .slice(0, 200)
    .map(row => ({
      line: row.line,
      class: row.class,
      error: row.error,
      quote: row.quote,
      rate: row.rate,
      kind: row.kind,
      date: row.date,
      existingRate: row.existingRate,
    }));
  return {
    status: 'ok',
    context: current.captured.context,
    operation,
    counts,
    ignoredColumns: parsed.ignoredColumns,
    rows,
  };
}

export async function importCommit({
  operation,
  policy,
  context,
}: {
  operation: number;
  policy: 'keep' | 'replace';
  context: string;
}): Promise<CommitResult> {
  const captured = await captureFxContext();
  if (!captured || !isFxCaptureActive(captured)) {
    return { status: 'superseded' };
  }
  return runMutator(async (): Promise<CommitResult> => {
    // Claim only after entering the mutation queue. Every attempt consumes its preview.
    const current = authority;
    if (
      !current ||
      current.operation !== operation ||
      current.state !== 'ready' ||
      !current.plan
    ) {
      return captured.context === context
        ? { status: 'error', code: 'preview-not-found' }
        : { status: 'superseded' };
    }
    authority = null;
    if (
      current.captured.context !== context ||
      !(await isFxContextCurrent(current.captured))
    ) {
      return { status: 'superseded' };
    }
    if (policy !== 'keep' && policy !== 'replace') {
      return { status: 'error', code: 'stale-preview' };
    }
    for (const [id, reviewed] of current.plan.fingerprints) {
      if (
        JSON.stringify(fingerprint(readRow(id))) !== JSON.stringify(reviewed)
      ) {
        return { status: 'error', code: 'stale-preview' };
      }
    }
    if (!isFxCaptureActive(current.captured)) return { status: 'superseded' };
    let written = 0;
    let replaced = 0;
    let kept = 0;
    const superseded = new Error('fx-import-superseded');
    try {
      await withUndo(() =>
        batchMessages(async () => {
          for (const row of current.plan?.rows ?? []) {
            if (!isFxCaptureActive(current.captured)) throw superseded;
            if (row.class === 'conflict' && policy === 'keep') {
              kept++;
              continue;
            }
            if (
              !row.value ||
              (row.class !== 'new' && row.class !== 'conflict')
            ) {
              continue;
            }
            await writeManualRate({
              baseCurrency: current.captured.baseCurrency,
              quoteCurrency: row.value.quoteCurrency,
              rate: row.value.rate,
              kind: row.value.kind,
              timestamp: utcMidnight(row.value.date),
            });
            written++;
            if (row.class === 'conflict') replaced++;
          }
          if (!isFxCaptureActive(current.captured)) throw superseded;
        }),
      );
    } catch (error) {
      if (error === superseded) return { status: 'superseded' };
      throw error;
    }
    return { status: 'ok', written, replaced, kept };
  });
}
