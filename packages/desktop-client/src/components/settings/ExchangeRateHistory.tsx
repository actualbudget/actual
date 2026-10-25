import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { listen, send } from '@actual-app/core/platform/client/connection';
import type {
  BackfillProgress,
  HistoryFilter,
  ImportFileError,
  ImportPreviewRow,
  ImportRowClass,
  ImportRowError,
} from '@actual-app/core/types/models/exchange-rate-history';

import type { FxProviderContext } from '#hooks/useFxProviderContext';

import { SettingsRow } from './SettingsRow';

type Policy = 'keep' | 'replace';
type Copy = (key: string, values?: Record<string, string | number>) => string;
type PlanKey = {
  quoteCurrency: string;
  from: string;
  to: string;
  policy: Policy;
};
type ReadyPlan = PlanKey & {
  context: string;
  dates: number;
  cached: number;
  toFetch: number;
};
type ImportState =
  | { phase: 'idle' }
  | { phase: 'choosing' }
  | { phase: 'pending' }
  | {
      phase: 'ready';
      operation: number;
      counts: Record<ImportRowClass, number>;
      ignoredColumns: string[];
      rows: ImportPreviewRow[];
      policy: Policy;
      confirming: boolean;
      consumed: boolean;
    }
  | { phase: 'message'; text: string };

function countLabel(name: ImportRowClass, count: number, t: Copy): string {
  switch (name) {
    case 'new':
      return t('New: {{count}}', { count });
    case 'unchanged':
      return t('Unchanged: {{count}}', { count });
    case 'conflict':
      return t('Different from a saved rate: {{count}}', { count });
    case 'duplicate-in-file':
      return t('Repeated in the file: {{count}}', { count });
    case 'conflict-in-file':
      return t('Conflicting within the file: {{count}}', { count });
    case 'skipped-fetched':
      return t('Fetched rates skipped: {{count}}', { count });
    default:
      return t('Invalid: {{count}}', { count });
  }
}

function policyOf(value: string): Policy {
  return value === 'replace' ? 'replace' : 'keep';
}

function samePlan(plan: PlanKey, form: PlanKey): boolean {
  return (
    plan.quoteCurrency === form.quoteCurrency &&
    plan.from === form.from &&
    plan.to === form.to &&
    plan.policy === form.policy
  );
}

function rowDetail(row: ImportPreviewRow): string {
  return [row.quote, row.rate, row.kind, row.date]
    .filter(part => part != null && part !== '')
    .join(' ');
}

function invalidReason(error: ImportRowError | undefined, t: Copy): string {
  switch (error) {
    case 'invalid-currency':
      return t('invalid currency');
    case 'invalid-base':
      return t('invalid base currency');
    case 'invalid-rate':
      return t('invalid rate');
    case 'invalid-kind':
      return t('invalid kind');
    case 'invalid-date':
      return t('invalid date');
    case 'cell-too-long':
      return t('a cell is too long');
    case 'column-count':
      return t('the wrong number of columns');
    case 'key-mismatch':
      return t('columns that do not match');
    default:
      return t('an invalid row');
  }
}

function previewLine(row: ImportPreviewRow, t: Copy): string {
  const detail = rowDetail(row);
  const values = {
    line: row.line,
    detail,
    existing: row.existingRate ?? '',
    reason: invalidReason(row.error, t),
  };
  switch (row.class) {
    case 'conflict':
      return t(
        'Line {{line}}: differs from the saved rate {{existing}}. {{detail}}',
        values,
      );
    case 'unchanged':
      return t('Line {{line}}: already saved. {{detail}}', values);
    case 'skipped-fetched':
      return t(
        'Line {{line}}: fetched rates are not imported. {{detail}}',
        values,
      );
    case 'invalid':
      return t('Line {{line}}: {{reason}}. {{detail}}', values);
    case 'duplicate-in-file':
      return t('Line {{line}}: repeated in the file. {{detail}}', values);
    case 'conflict-in-file':
      return t(
        'Line {{line}}: conflicts with another row in the file. {{detail}}',
        values,
      );
    default:
      return t('Line {{line}}: {{detail}}', values);
  }
}

function fileErrorText(error: ImportFileError, t: Copy): string {
  if (error.code === 'missing-column') {
    switch (error.column) {
      case 'quote_currency':
        return t('The file has no quote currency column.');
      case 'rate':
        return t('The file has no rate column.');
      case 'kind':
        return t('The file has no kind column.');
      default:
        return t('The file has no date column.');
    }
  }
  if (error.code === 'duplicate-column') {
    return t('The file repeats the {{column}} column.', {
      column: error.column,
    });
  }
  switch (error.code) {
    case 'file-unreadable':
      return t('The file could not be read.');
    case 'file-too-large':
      return t('The file is too large.');
    case 'invalid-encoding':
      return t('The file is not UTF-8 text.');
    case 'empty-file':
      return t('The file has no rates to import.');
    case 'too-many-rows':
      return t('The file has too many rows.');
    default:
      return t('The file could not be read as CSV.');
  }
}

function statusErrorText(statusCode: string | undefined, t: Copy): string {
  switch (statusCode) {
    case 'network':
      return t('The sync server could not be reached.');
    case 'timeout':
      return t('The sync server did not answer in time.');
    case 'unauthorized':
      return t('The sync server did not accept the sign-in.');
    case 'token-expired':
      return t('The sync server sign-in has expired.');
    default:
      return t('The sync server could not check the exchange rate provider.');
  }
}

function planErrorText(
  error: {
    code:
      | 'range-invalid'
      | 'range-too-large'
      | 'range-future'
      | 'currency-invalid'
      | 'no-server'
      | 'no-provider'
      | 'not-installed'
      | 'not-configured'
      | 'status-unavailable'
      | 'busy';
    statusCode?:
      | 'network'
      | 'timeout'
      | 'unauthorized'
      | 'token-expired'
      | 'server-error';
  },
  t: Copy,
): string {
  switch (error.code) {
    case 'no-server':
      return t(
        'Backfill needs a sync server. Rates you save or import work without one.',
      );
    case 'no-provider':
      return t('The sync server has no exchange rate provider available.');
    case 'not-installed':
    case 'not-configured':
      return t(
        'The exchange rate provider on the sync server is not available.',
      );
    case 'status-unavailable':
      return statusErrorText(error.statusCode, t);
    case 'range-invalid':
      return t('Enter a start date that is on or before the end date.');
    case 'range-too-large':
      return t('Choose a date range of 366 days or fewer.');
    case 'range-future':
      return t('The end date cannot be after today.');
    case 'currency-invalid':
      return t('Choose a currency other than the budget currency.');
    default:
      return t('A backfill is already running.');
  }
}

function progressText(progress: BackfillProgress, t: Copy): string {
  if (progress.state === 'running') {
    return t('Backfill running. Processed {{done}} of {{total}} dates', {
      done: progress.done,
      total: progress.total,
    });
  }
  if (progress.state === 'done') {
    return t(
      'Backfill finished. Processed {{done}} of {{total}} dates: {{inserted}} added, {{replaced}} replaced, {{existing}} already saved, {{cached}} cached, {{missing}} missing, {{failed}} failed.',
      {
        done: progress.done,
        total: progress.total,
        inserted: progress.inserted,
        replaced: progress.replaced,
        existing: progress.existing,
        cached: progress.cached,
        missing: progress.missing,
        failed: progress.failed,
      },
    );
  }
  switch (progress.stopReason) {
    case 'cancelled':
      return t('Backfill cancelled.');
    case 'rate-limited':
      return t('Backfill stopped because the provider asked to slow down.');
    case 'auth':
      return t(
        'Backfill stopped because the provider did not accept the sign-in.',
      );
    case 'provider-failing':
      return t('Backfill stopped because the provider kept failing.');
    case 'not-installed':
    case 'not-configured':
      return t('Backfill stopped because the provider is not available.');
    case 'deadline':
      return t('Backfill stopped because it reached its time limit.');
    case 'superseded':
      return t('Backfill stopped because the budget changed.');
    default:
      return t('Backfill stopped.');
  }
}

export function ExchangeRateHistory({
  fx,
  filter,
  quoteOptions,
  onRatesChanged,
}: {
  fx: FxProviderContext;
  filter: HistoryFilter;
  quoteOptions: ReadonlyArray<readonly [string, string]>;
  onRatesChanged: () => void;
}) {
  const { t } = useTranslation();
  const fxRef = useRef(fx);
  fxRef.current = fx;
  const mounted = useRef(true);
  const chooseRequest = useRef(0);
  const activeOperation = useRef<number | null>(null);
  const planRequest = useRef(0);
  const exportRequest = useRef(0);
  const startRequest = useRef(0);
  const awaitingStart = useRef(false);
  const [startPending, setStartPending] = useState(false);
  const activeJob = useRef<string | null>(null);
  const progressBuffer = useRef<BackfillProgress[]>([]);
  const [importState, setImportState] = useState<ImportState>({
    phase: 'idle',
  });
  const [quote, setQuote] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [policy, setPolicy] = useState<Policy>('keep');
  const formRef = useRef<PlanKey>({
    quoteCurrency: quote,
    from,
    to,
    policy,
  });
  formRef.current = { quoteCurrency: quote, from, to, policy };
  const [plan, setPlan] = useState<ReadyPlan | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<BackfillProgress | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const seen = useRef({
    budgetId: fx.budgetId,
    epoch: fx.epoch,
    context: fx.context,
  });

  function invalidateImport() {
    const operation = activeOperation.current;
    chooseRequest.current += 1;
    activeOperation.current = null;
    if (operation !== null) {
      void send('exchange-rates/import-cancel', { operation });
    }
    setImportState({ phase: 'idle' });
  }

  function clearPlan() {
    planRequest.current += 1;
    setPlan(null);
    setConfirming(false);
    setPlanError(null);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const operation = activeOperation.current;
      chooseRequest.current += 1;
      planRequest.current += 1;
      exportRequest.current += 1;
      startRequest.current += 1;
      awaitingStart.current = false;
      activeOperation.current = null;
      if (operation !== null) {
        void send('exchange-rates/import-cancel', { operation });
      }
    };
  }, []);

  useEffect(() => {
    const previous = seen.current;
    if (
      previous.budgetId === fx.budgetId &&
      previous.epoch === fx.epoch &&
      previous.context === fx.context
    ) {
      return;
    }
    seen.current = {
      budgetId: fx.budgetId,
      epoch: fx.epoch,
      context: fx.context,
    };
    if (previous.budgetId !== fx.budgetId) {
      planRequest.current += 1;
      exportRequest.current += 1;
    }
    if (previous.budgetId !== fx.budgetId || previous.epoch !== fx.epoch) {
      invalidateImport();
    }
    // A replacement bumps the epoch. Drop the previous context's plan
    // error without retiring the in-flight plan: the first successful
    // plan still has to establish the provider identity.
    if (previous.epoch !== fx.epoch) {
      setPlanError(null);
    }
    if (previous.context !== fx.context || previous.budgetId !== fx.budgetId) {
      startRequest.current += 1;
      awaitingStart.current = false;
      setStartPending(false);
      activeJob.current = null;
      progressBuffer.current = [];
      setJobId(null);
      setProgress(null);
      setConfirming(false);
      setPlan(current =>
        current && current.context !== fx.context ? null : current,
      );
    }
  }, [fx.budgetId, fx.epoch, fx.context]);

  useEffect(() => {
    return listen('fx-backfill-progress', event => {
      if (event.context !== fxRef.current.current()) return;
      if (awaitingStart.current) {
        const rest = progressBuffer.current.filter(
          item => item.jobId !== event.jobId,
        );
        progressBuffer.current = [...rest, event].slice(-8);
        return;
      }
      if (event.jobId !== activeJob.current) return;
      setProgress(event);
      if (event.state !== 'running') {
        activeJob.current = null;
        setJobId(null);
        setStartPending(false);
      }
    });
  }, []);

  async function onExport() {
    const request = ++exportRequest.current;
    const origin = fxRef.current;
    const result = await send('exchange-rates/history-export', filter);
    if (
      !mounted.current ||
      request !== exportRequest.current ||
      origin.budgetId !== fxRef.current.budgetId ||
      result.status !== 'ok'
    ) {
      return;
    }
    origin.observe(result.context);
    if (
      !mounted.current ||
      request !== exportRequest.current ||
      origin.budgetId !== fxRef.current.budgetId ||
      origin.current() !== result.context
    ) {
      return;
    }
    await window.Actual.saveFile(
      result.csv,
      result.filename,
      t('Export exchange rates'),
    );
    if (
      !mounted.current ||
      request !== exportRequest.current ||
      origin.budgetId !== fxRef.current.budgetId
    ) {
      return;
    }
    setExportMessage(
      t('Rates exported: {{count}}. Invalid rates left out: {{omitted}}.', {
        count: result.rowCount,
        omitted: result.omittedCount,
      }),
    );
  }

  async function chooseFile() {
    const previous = activeOperation.current;
    // The generation moves before the dialog, so Cancel can retire this
    // choice even when the dialog never resolves.
    const request = ++chooseRequest.current;
    activeOperation.current = null;
    if (previous !== null) {
      void send('exchange-rates/import-cancel', { operation: previous });
    }
    setImportState({ phase: 'choosing' });
    const paths = await window.Actual.openFileDialog({
      filters: [{ name: t('CSV files'), extensions: ['csv'] }],
    });
    if (!mounted.current || request !== chooseRequest.current) return;
    const filepath = paths[0];
    if (!filepath) {
      setImportState({ phase: 'idle' });
      return;
    }
    setImportState({ phase: 'pending' });
    const begun = await send('exchange-rates/import-preview-begin');
    if (!mounted.current || request !== chooseRequest.current) {
      if (begun.status === 'ok') {
        void send('exchange-rates/import-cancel', {
          operation: begun.operation,
        });
      }
      return;
    }
    if (begun.status !== 'ok') {
      setImportState({ phase: 'idle' });
      return;
    }
    fxRef.current.observe(begun.context);
    if (fxRef.current.current() !== begun.context) {
      void send('exchange-rates/import-cancel', { operation: begun.operation });
      setImportState({ phase: 'idle' });
      return;
    }
    activeOperation.current = begun.operation;
    const preview = await send('exchange-rates/import-preview', {
      operation: begun.operation,
      filepath,
    });
    if (
      !mounted.current ||
      request !== chooseRequest.current ||
      activeOperation.current !== begun.operation
    ) {
      return;
    }
    if (preview.status === 'superseded') {
      activeOperation.current = null;
      setImportState({ phase: 'idle' });
      return;
    }
    if (preview.status === 'error') {
      activeOperation.current = null;
      setImportState({ phase: 'message', text: fileErrorText(preview, t) });
      return;
    }
    if (preview.operation !== begun.operation) return;
    fxRef.current.observe(preview.context);
    if (fxRef.current.current() !== preview.context) return;
    setImportState({
      phase: 'ready',
      operation: preview.operation,
      counts: preview.counts,
      ignoredColumns: preview.ignoredColumns,
      rows: preview.rows,
      policy: 'keep',
      confirming: false,
      consumed: false,
    });
  }

  async function commitImport() {
    if (importState.phase !== 'ready' || importState.consumed) return;
    const { operation, policy: chosen } = importState;
    const context = fxRef.current.current();
    if (!context) return;
    setImportState({ ...importState, consumed: true, confirming: false });
    const result = await send('exchange-rates/import-commit', {
      operation,
      policy: chosen,
      context,
    });
    if (!mounted.current || activeOperation.current !== operation) return;
    activeOperation.current = null;
    if (result.status === 'ok') {
      setImportState({
        phase: 'message',
        text: t(
          'Rates written: {{written}}. Replaced: {{replaced}}. Kept unchanged: {{kept}}.',
          result,
        ),
      });
      onRatesChanged();
      return;
    }
    if (result.status === 'error' && result.code === 'stale-preview') {
      setImportState({
        phase: 'message',
        text: t(
          'The saved rates changed after this preview. Choose the file again to review them.',
        ),
      });
      return;
    }
    if (result.status === 'error' && result.code === 'preview-not-found') {
      setImportState({
        phase: 'message',
        text: t('This preview is no longer available. Choose the file again.'),
      });
      return;
    }
    setImportState({
      phase: 'message',
      text: t('The rates could not be imported. Choose the file again.'),
    });
  }

  async function checkDates() {
    const request = ++planRequest.current;
    const origin = fxRef.current;
    const originEpoch = origin.epoch;
    const key = { ...formRef.current };
    setPlan(null);
    setConfirming(false);
    setPlanError(null);
    const result = await send('exchange-rates/backfill-plan', key);
    if (
      !mounted.current ||
      request !== planRequest.current ||
      origin.budgetId !== fxRef.current.budgetId ||
      !samePlan(key, formRef.current)
    ) {
      return;
    }
    if (result.status === 'superseded') return;
    if (result.status === 'error') {
      // Accept the error only for the context epoch that asked. A
      // same-budget replacement keeps the request generation so a
      // successful first plan can still seed the provider.
      if (originEpoch !== fxRef.current.epoch) return;
      setPlanError(planErrorText(result, t));
      return;
    }
    // Seed from the budget that asked, including the first plan that
    // establishes the provider identity. A later budget must not observe it.
    origin.observe(result.context);
    if (
      !mounted.current ||
      request !== planRequest.current ||
      origin.budgetId !== fxRef.current.budgetId ||
      origin.current() !== result.context
    ) {
      return;
    }
    setPlan({
      ...key,
      context: result.context,
      dates: result.dates,
      cached: result.cached,
      toFetch: result.toFetch,
    });
  }

  function finishJob(event: BackfillProgress) {
    if (event.state === 'running') return;
    if (activeJob.current !== event.jobId) return;
    activeJob.current = null;
    setJobId(null);
    setStartPending(false);
  }

  async function runStart(ready: ReadyPlan) {
    if (awaitingStart.current) return;
    const originBudget = fxRef.current.budgetId;
    const request = ++startRequest.current;
    awaitingStart.current = true;
    setStartPending(true);
    progressBuffer.current = [];
    const result = await send('exchange-rates/backfill-start', {
      quoteCurrency: ready.quoteCurrency,
      from: ready.from,
      to: ready.to,
      policy: ready.policy,
      context: ready.context,
    });
    if (!mounted.current || request !== startRequest.current) return;
    awaitingStart.current = false;
    if (result.status !== 'started') {
      progressBuffer.current = [];
      setStartPending(false);
      if (result.status === 'error') setPlanError(planErrorText(result, t));
      return;
    }
    if (
      fxRef.current.budgetId !== originBudget ||
      fxRef.current.current() !== ready.context
    ) {
      progressBuffer.current = [];
      setStartPending(false);
      return;
    }
    activeJob.current = result.jobId;
    setJobId(result.jobId);
    const latest = progressBuffer.current
      .filter(event => event.jobId === result.jobId)
      .at(-1);
    progressBuffer.current = [];
    if (latest) {
      setProgress(latest);
      finishJob(latest);
    }
  }

  function startBackfill() {
    if (awaitingStart.current || startPending) return;
    if (
      !plan ||
      !samePlan(plan, formRef.current) ||
      plan.context !== fx.context
    ) {
      return;
    }
    if (plan.policy === 'replace' && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    void runStart(plan);
  }

  function cancelBackfill() {
    if (!jobId) return;
    void send('exchange-rates/backfill-cancel', { jobId });
  }

  const canStart =
    !startPending &&
    plan !== null &&
    samePlan(plan, formRef.current) &&
    plan.context === fx.context;
  const showCancel =
    importState.phase === 'choosing' ||
    importState.phase === 'pending' ||
    (importState.phase === 'ready' && !importState.consumed);

  return (
    <>
      <SettingsRow
        title={t('Export')}
        description={exportMessage ?? undefined}
        control={
          <Button
            onPress={() => {
              void onExport();
            }}
          >
            <Trans>Export rates</Trans>
          </Button>
        }
      />
      <SettingsRow
        title={t('Import')}
        description={t(
          'Choose a CSV file of manual rates. Fetched rates in the file are skipped.',
        )}
        control={
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              onPress={() => {
                void chooseFile();
              }}
            >
              <Trans>Choose file</Trans>
            </Button>
            {showCancel && (
              <Button onPress={invalidateImport}>
                <Trans>Cancel import</Trans>
              </Button>
            )}
          </View>
        }
      >
        {importState.phase === 'ready' && !importState.consumed && (
          <View style={{ gap: 8 }}>
            {(
              [
                'new',
                'unchanged',
                'conflict',
                'duplicate-in-file',
                'conflict-in-file',
                'skipped-fetched',
                'invalid',
              ] as const
            ).map(name => (
              <Text key={name} style={styles.smallText}>
                {countLabel(name, importState.counts[name], t)}
              </Text>
            ))}
            {importState.ignoredColumns.length > 0 && (
              <Text style={styles.smallText}>
                {t('Ignored columns: {{columns}}', {
                  columns: importState.ignoredColumns.join(', '),
                })}
              </Text>
            )}
            {importState.rows.map(row => (
              <Text key={row.line} style={styles.smallText}>
                {previewLine(row, t)}
              </Text>
            ))}
            <Select
              id="exchange-rate-import-policy"
              value={importState.policy}
              onChange={value => {
                setImportState(current =>
                  current.phase === 'ready'
                    ? {
                        ...current,
                        policy: policyOf(value),
                        confirming: false,
                      }
                    : current,
                );
              }}
              options={[
                ['keep', t('Keep existing')],
                ['replace', t('Replace existing')],
              ]}
            />
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onPress={() => {
                  if (
                    importState.policy === 'replace' &&
                    !importState.confirming
                  ) {
                    setImportState({ ...importState, confirming: true });
                    return;
                  }
                  void commitImport();
                }}
              >
                <Trans>Import</Trans>
              </Button>
              {importState.confirming && (
                <Button
                  variant="primary"
                  onPress={() => {
                    void commitImport();
                  }}
                >
                  <Trans>Replace and import</Trans>
                </Button>
              )}
            </View>
            {importState.confirming && (
              <Text style={styles.smallText}>
                {t(
                  'Saved rates to replace: {{count}}. Replace them with the rates in this file? You can undo the import.',
                  { count: importState.counts.conflict },
                )}
              </Text>
            )}
          </View>
        )}
        {importState.phase === 'message' && (
          <Text style={styles.smallText}>{importState.text}</Text>
        )}
      </SettingsRow>
      <SettingsRow
        title={t('Backfill')}
        description={t(
          'Ask the sync server for fetched rates over a date range. Rates you save or import do not need it.',
        )}
        htmlFor="exchange-rate-backfill-quote"
        control={
          <Select
            id="exchange-rate-backfill-quote"
            value={quote}
            onChange={value => {
              setQuote(value);
              clearPlan();
            }}
            options={[['', t('Choose a currency')], ...quoteOptions]}
          />
        }
      >
        <SettingsRow
          title={t('Backfill from')}
          htmlFor="exchange-rate-backfill-from"
          isNested
          control={
            <Input
              id="exchange-rate-backfill-from"
              type="date"
              value={from}
              onChangeValue={value => {
                setFrom(value);
                clearPlan();
              }}
            />
          }
        />
        <SettingsRow
          title={t('Backfill to')}
          htmlFor="exchange-rate-backfill-to"
          isNested
          control={
            <Input
              id="exchange-rate-backfill-to"
              type="date"
              value={to}
              onChangeValue={value => {
                setTo(value);
                clearPlan();
              }}
            />
          }
        />
        <SettingsRow
          title={t('When a fetched rate is already saved')}
          htmlFor="exchange-rate-backfill-policy"
          isNested
          control={
            <Select
              id="exchange-rate-backfill-policy"
              value={policy}
              onChange={value => {
                setPolicy(policyOf(value));
                clearPlan();
              }}
              options={[
                ['keep', t('Keep existing')],
                ['replace', t('Replace existing')],
              ]}
            />
          }
        />
        {plan && (
          <Text style={styles.smallText}>
            {t(
              'Dates: {{dates}}. Already saved: {{cached}}. To fetch: {{toFetch}}.',
              plan,
            )}
          </Text>
        )}
        {confirming && plan && (
          <Text style={styles.smallText}>
            {t(
              'Dates to fetch: {{count}}. Replace the fetched rates already saved for them? Backfill changes cannot be undone.',
              { count: plan.toFetch },
            )}
          </Text>
        )}
        {planError && (
          <Text style={{ ...styles.smallText, color: theme.errorText }}>
            {planError}
          </Text>
        )}
        <View data-testid="exchange-rate-backfill-progress" aria-live="polite">
          {progress && (
            <Text style={styles.smallText}>{progressText(progress, t)}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button
            onPress={() => {
              void checkDates();
            }}
          >
            <Trans>Check dates</Trans>
          </Button>
          <Button isDisabled={!canStart} onPress={startBackfill}>
            <Trans>Start backfill</Trans>
          </Button>
          {confirming && (
            <Button
              variant="primary"
              isDisabled={startPending}
              onPress={() => {
                if (awaitingStart.current || !plan) return;
                void runStart(plan);
                setConfirming(false);
              }}
            >
              <Trans>Replace and start</Trans>
            </Button>
          )}
          {jobId && (
            <Button onPress={cancelBackfill}>
              <Trans>Cancel backfill</Trans>
            </Button>
          )}
        </View>
      </SettingsRow>
    </>
  );
}
