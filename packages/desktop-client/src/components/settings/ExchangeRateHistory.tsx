import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type {
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

export function ExchangeRateHistory({
  fx,
  filter,
  onRatesChanged,
}: {
  fx: FxProviderContext;
  filter: HistoryFilter;
  onRatesChanged: () => void;
}) {
  const { t } = useTranslation();
  const fxRef = useRef(fx);
  fxRef.current = fx;
  const mounted = useRef(true);
  const chooseRequest = useRef(0);
  const activeOperation = useRef<number | null>(null);
  const exportRequest = useRef(0);
  const [importState, setImportState] = useState<ImportState>({
    phase: 'idle',
  });
  const [exportMessage, setExportMessage] = useState<string | null>(null);
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

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const operation = activeOperation.current;
      chooseRequest.current += 1;
      exportRequest.current += 1;
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
      exportRequest.current += 1;
    }
    if (previous.budgetId !== fx.budgetId || previous.epoch !== fx.epoch) {
      invalidateImport();
    }
  }, [fx.budgetId, fx.epoch, fx.context]);

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
    </>
  );
}
