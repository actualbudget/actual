// @ts-strict-ignore
import type {
  ComponentProps,
  Dispatch,
  ReactNode,
  SetStateAction,
} from 'react';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { ParseFileOptions } from '@actual-app/core/server/transactions/import/parse-file';
import { useQueryClient } from '@tanstack/react-query';

import {
  useImportPreviewTransactionsMutation,
  useImportTransactionsMutation,
} from '#accounts';
import type { ImportRow } from '#accounts/mutations';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { SectionLabel } from '#components/forms';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { TableHeader, TableWithNavigator } from '#components/table';
import {
  AccountCurrencyFormat,
  useCurrencyFormatOverride,
} from '#hooks/currencyFormatContext';
import { useAccount } from '#hooks/useAccount';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useCategories } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { useMulticurrencyAvailable } from '#hooks/useMulticurrencyAvailable';
import { useSyncedPrefs } from '#hooks/useSyncedPrefs';
import { addNotification } from '#notifications/notificationsSlice';
import { payeeQueries } from '#payees';
import { useDispatch } from '#redux';

import { DateFormatSelect } from './DateFormatSelect';
import { FieldMappings } from './FieldMappings';
import { InOutOption } from './InOutOption';
import { MissingRateForm } from './MissingRateForm';
import { MultiplierOption } from './MultiplierOption';
import { SelectField } from './SelectField';
import { SubLabel } from './SubLabel';
import { Transaction } from './Transaction';
import type { DateFormat, FieldMapping, ImportTransaction } from './utils';
import {
  applyFieldMappings,
  currencyColumnOf,
  dateFormats,
  filterByStartDate,
  isDateFormat,
  parseCategoryFields,
  parseDate,
  parseImportAmount,
  splitByCurrency,
  stripCsvImportTransaction,
} from './utils';

function CheckboxToggle({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: Dispatch<SetStateAction<boolean>>;
  children: ReactNode;
}) {
  return (
    <LabeledCheckbox
      id={id}
      checked={checked}
      onChange={() => onChange(prev => !prev)}
    >
      {children}
    </LabeledCheckbox>
  );
}

function getFileType(filepath: string): string {
  const m = filepath.match(/\.([^.]*)$/);
  if (!m) return 'ofx';
  const rawType = m[1].toLowerCase();
  if (rawType === 'tsv') return 'csv';
  return rawType;
}

function getInitialDateFormat(transactions, mappings) {
  if (transactions.length === 0 || mappings.date == null) {
    return 'yyyy mm dd';
  }

  const transaction = transactions[0];
  const date = transaction[mappings.date];

  const found =
    date == null
      ? null
      : dateFormats.find(f => parseDate(date, f.format) != null);
  return found ? found.format : 'mm dd yyyy';
}

/**
 * Field mappings with any field reading the currency column unmapped, so
 * auto-detection never also imports the currency cell as notes or payee.
 */
function withoutColumn<T extends Record<string, string | null>>(
  mappings: T,
  column: string | null,
): T {
  if (column === null) return mappings;
  return Object.fromEntries(
    Object.entries(mappings).map(([field, value]) => [
      field,
      value === column ? null : value,
    ]),
  ) as T;
}

function getInitialMappings(transactions) {
  if (transactions.length === 0) {
    return {};
  }

  const transaction = stripCsvImportTransaction(transactions[0]);
  const fields = Object.entries(transaction);

  function key(entry) {
    return entry ? entry[0] : null;
  }

  const dateField = key(
    fields.find(([name]) => name.toLowerCase().includes('date')) ||
      fields.find(([, value]) => String(value)?.match(/^\d+[-/]\d+[-/]\d+$/)),
  );

  const amountField = key(
    fields.find(([name]) => name.toLowerCase().includes('amount')) ||
      fields.find(([, value]) => String(value)?.match(/^-?[.,\d]+$/)),
  );

  const categoryField = key(
    fields.find(([name]) => name.toLowerCase().includes('category')),
  );

  const payeeField = key(
    fields.find(([name]) => name.toLowerCase().includes('payee')) ||
      fields.find(
        ([name]) =>
          name !== dateField && name !== amountField && name !== categoryField,
      ),
  );

  const notesField = key(
    fields.find(([name]) => name.toLowerCase().includes('notes')) ||
      fields.find(
        ([name]) =>
          name !== dateField &&
          name !== amountField &&
          name !== categoryField &&
          name !== payeeField,
      ),
  );

  const inOutField = key(
    fields.find(
      ([name]) =>
        name !== dateField &&
        name !== amountField &&
        name !== payeeField &&
        name !== notesField,
    ),
  );

  return {
    date: dateField,
    amount: amountField,
    payee: payeeField,
    notes: notesField,
    inOut: inOutField,
    category: categoryField,
  };
}

type LastParse = {
  filename: string;
  fileType: string;
  options: ParseFileOptions;
};

const parseOptionKeys = [
  'hasHeaderRow',
  'delimiter',
  'encoding',
  'fallbackMissingPayeeToMemo',
  'swapPayeeAndMemo',
  'skipStartLines',
  'skipEndLines',
  'importNotes',
] satisfies Array<keyof ParseFileOptions>;

function shouldPreserveImportSettingsForParse(
  lastParse: LastParse | null,
  filename: string,
  fileType: string,
  options: ParseFileOptions,
) {
  return (
    fileType === 'csv' &&
    lastParse?.filename === filename &&
    lastParse.fileType === fileType &&
    parseOptionKeys.every(key =>
      key === 'skipEndLines'
        ? lastParse.options[key] !== options[key]
        : lastParse.options[key] === options[key],
    )
  );
}

export function ImportTransactionsModal(props: {
  filename: string;
  accountId: string;
  onImported?: (didChange: boolean) => void;
}) {
  const account = useAccount(props.accountId);
  // An account in another currency imports and shows its own amounts.
  return (
    <AccountCurrencyFormat account={account ?? undefined}>
      <ImportTransactionsModalBody {...props} isForeign={!!account?.currency} />
    </AccountCurrencyFormat>
  );
}

function ImportTransactionsModalBody({
  filename: originalFileName,
  accountId,
  onImported,
  isForeign,
}: {
  filename: string;
  accountId: string;
  onImported?: (didChange: boolean) => void;
  isForeign: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const dateFormat = useDateFormat() || ('MM/dd/yyyy' as const);
  const precision = useAmountPrecision();
  const [prefs, savePrefs] = useSyncedPrefs();
  const { data: { list: categories } = { list: [] } } = useCategories();

  const [multiplierAmount, setMultiplierAmount] = useState('');
  const [loadingState, setLoadingState] = useState<
    null | 'parsing' | 'importing'
  >('parsing');
  // Rows needing a rate; a null row id (a rejected import) always blocks.
  const [missingRates, setMissingRates] = useState<
    Array<{ trxId: string | null; date: string }>
  >([]);
  // Saving a missing rate re-runs the preview.
  const [rateVersion, setRateVersion] = useState(0);
  const previewRequestId = useRef(0);
  const currencyCode = useCurrencyFormatOverride()?.currencyCode;
  const dispatch = useDispatch();
  const multicurrencyAvailable = useMulticurrencyAvailable();
  // A CSV currency column (MC-7.5): rows in another currency are left out.
  const [currencyColumn, setCurrencyColumn] = useState<string | null>(null);
  const [rejectedRows, setRejectedRows] = useState<
    Array<{ row: ImportTransaction; value: string }>
  >([]);
  // The column and code the preview on screen was split with.
  const [previewSplitKey, setPreviewSplitKey] = useState<string | null>(null);
  const [error, setError] = useState<{
    parsed: boolean;
    message: string;
  } | null>(null);
  const [filename, setFilename] = useState(originalFileName);
  const [transactions, setTransactions] = useState<ImportTransaction[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<
    ImportTransaction[]
  >([]);
  const [filetype, setFileType] = useState('unknown');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [flipAmount, setFlipAmount] = useState(false);
  const [multiplierEnabled, setMultiplierEnabled] = useState(false);
  const [reconcile, setReconcile] = useState(true);
  const [importNotes, setImportNotes] = useState(true);

  // This cannot be set after parsing the file, because changing it
  // requires re-parsing the file. This is different from the other
  // options which are simple post-processing. That means if you
  // parsed different files without closing the modal, it wouldn't
  // re-read this.
  const [delimiter, setDelimiter] = useState(
    prefs[`csv-delimiter-${accountId}`] ||
      (filename.endsWith('.tsv') ? '\t' : ','),
  );
  const [csvEncoding, setCsvEncoding] = useState(
    prefs[`csv-encoding-${accountId}`] || 'auto',
  );
  const [skipStartLines, setSkipStartLines] = useState(
    parseInt(prefs[`csv-skip-start-lines-${accountId}`], 10) || 0,
  );
  const [skipEndLines, setSkipEndLines] = useState(
    parseInt(prefs[`csv-skip-end-lines-${accountId}`], 10) || 0,
  );
  const [inOutMode, setInOutMode] = useState(
    String(prefs[`csv-in-out-mode-${accountId}`]) === 'true',
  );
  const [outValue, setOutValue] = useState(
    prefs[`csv-out-value-${accountId}`] ?? '',
  );
  const [hasHeaderRow, setHasHeaderRow] = useState(
    String(prefs[`csv-has-header-${accountId}`]) !== 'false',
  );
  const [fallbackMissingPayeeToMemo, setFallbackMissingPayeeToMemo] = useState(
    String(prefs[`ofx-fallback-missing-payee-${accountId}`]) !== 'false',
  );
  const [ofxSwapPayeeAndMemo, setOfxSwapPayeeAndMemo] = useState(
    String(prefs[`ofx-swap-payee-memo-${accountId}`]) === 'true',
  );
  const [qifSwapPayeeAndMemo, setQifSwapPayeeAndMemo] = useState(
    String(prefs[`qif-swap-payee-memo-${accountId}`]) === 'true',
  );
  const [camtSwapPayeeAndMemo, setCamtSwapPayeeAndMemo] = useState(
    String(prefs[`camt-swap-payee-memo-${accountId}`]) === 'true',
  );
  const [reimportDeleted, setReimportDeleted] = useState(
    String(prefs[`import-reimport-deleted-${accountId}`] || 'true') === 'true',
  );

  const [parseDateFormat, setParseDateFormat] = useState<DateFormat | null>(
    null,
  );

  const [clearOnImport, setClearOnImport] = useState(true);
  const [startDate, setStartDate] = useState('');
  const lastParseRef = useRef<LastParse | null>(null);
  // The account's code, the budget currency's for an inheriting account.
  const accountCode = currencyCode ?? prefs.defaultCurrencyCode ?? '';
  // Every column any row has: csv-parse leaves out a short row's missing
  // trailing cells, so the first row alone can hide one.
  const csvColumns = [
    ...new Set(
      parsedTransactions.flatMap(row =>
        // base_amount is a preview annotation, never a file column.
        Object.keys(stripCsvImportTransaction(row)).filter(
          key => key !== 'base_amount',
        ),
      ),
    ),
  ];
  // A saved column this file does not have is not mapped.
  const splitKeyOf = (column: string | null) =>
    `${column ?? ''}|${accountCode}`;
  const effectiveCurrencyColumn =
    filetype === 'csv' &&
    multicurrencyAvailable &&
    currencyColumn !== null &&
    csvColumns.includes(currencyColumn)
      ? currencyColumn
      : null;

  const getImportPreview = useCallback(
    async (
      transactions: ImportTransaction[],
      filetype: string,
      flipAmount: boolean,
      fieldMappings: FieldMapping | null,
      splitMode: boolean,
      parseDateFormat: DateFormat,
      inOutMode: boolean,
      outValue: string,
      multiplierAmount: string,
    ) => {
      const previewTransactions = [];
      const inOutModeEnabled = isOfxFile(filetype) ? false : inOutMode;
      // OFX and CAMT dates arrive already parsed, as in the import itself.
      const getTransDate: (trans: ImportTransaction) => string | null =
        isOfxFile(filetype) || isCamtFile(filetype)
          ? trans => trans.date ?? null
          : trans => parseDate(trans.date, parseDateFormat);

      // Note that the sort will behave unpredictably if any date fails to parse.
      transactions.sort((a, b) => {
        const aDate = getTransDate(a);
        const bDate = getTransDate(b);

        return aDate < bDate ? 1 : aDate === bDate ? 0 : -1;
      });

      for (let trans of transactions) {
        if (trans.isMatchedTransaction) {
          // skip transactions that are matched transaction (existing transaction added to show update changes)
          continue;
        }

        trans = fieldMappings
          ? applyFieldMappings(trans, fieldMappings)
          : trans;

        const date = getTransDate(trans);
        if (date == null) {
          console.log(
            `Unable to parse date ${
              trans.date || '(empty)'
            } with given date format`,
          );
          break;
        }
        if (trans.payee_name == null || typeof trans.payee_name !== 'string') {
          console.log(`Unable·to·parse·payee·${trans.payee_name || '(empty)'}`);
          break;
        }

        const amount = parseImportAmount(
          trans,
          splitMode,
          inOutModeEnabled,
          outValue,
          flipAmount,
          multiplierAmount,
          precision,
        );
        if (amount == null) {
          console.log(`Transaction on ${trans.date} has no amount`);
          break;
        }

        const category_id = parseCategoryFields(trans, categories);

        const {
          inflow: _inflow,
          outflow: _outflow,
          inOut: _inOut,
          existing: _existing,
          ignored: _ignored,
          selected: _selected,
          selected_merge: _selected_merge,
          tombstone: _tombstone,
          base_amount: _baseAmount,
          ...finalTransaction
        } = trans;
        previewTransactions.push({
          ...finalTransaction,
          category: category_id,
          date,
          amount,
          cleared: clearOnImport,
        });
      }

      return previewTransactions;
    },
    [categories, clearOnImport, precision],
  );

  const parse = useCallback(
    async (
      filename: string,
      options: ParseFileOptions,
      { preserveImportSettings = false } = {},
    ) => {
      setLoadingState('parsing');

      const filetype = getFileType(filename);
      setFilename(filename);
      setFileType(filetype);

      const { errors, transactions: parsedTransactions = [] } = await send(
        'transactions-parse-file',
        {
          filepath: filename,
          options,
          // Amounts are parsed at the account's own precision.
          accountId,
        },
      );

      let index = 0;
      const transactions = parsedTransactions.map(trans => {
        // Add a transient transaction id to match preview with imported transactions
        // @ts-expect-error - trans is unknown type, adding properties dynamically
        trans.trx_id = String(index++);
        // Select all parsed transactions before first preview run
        // @ts-expect-error - trans is unknown type, adding properties dynamically
        trans.selected = true;
        return trans;
      });

      setError(null);

      /// Do fine grained reporting between the old and new OFX importers.
      if (errors.length > 0) {
        setError({
          parsed: true,
          message: errors[0].message || 'Internal error',
        });
      } else {
        if (
          !preserveImportSettings &&
          (filetype === 'csv' || filetype === 'qif')
        ) {
          const flipAmount =
            String(prefs[`flip-amount-${accountId}-${filetype}`]) === 'true';
          setFlipAmount(flipAmount);
        }

        if (filetype === 'csv') {
          if (!preserveImportSettings) {
            let mappings = prefs[`csv-mappings-${accountId}`];
            mappings = mappings
              ? JSON.parse(mappings)
              : getInitialMappings(transactions);

            const savedCurrencyColumn = currencyColumnOf(
              prefs[`csv-currency-column-${accountId}`],
            );
            // The saved column applies only with multicurrency and when this
            // file has it, as for the preview; otherwise the field mappings
            // stay as saved.
            const activeCurrencyColumn =
              multicurrencyAvailable &&
              savedCurrencyColumn !== null &&
              transactions.some(row => savedCurrencyColumn in row)
                ? savedCurrencyColumn
                : null;
            // @ts-expect-error - mappings might not have outflow/inflow properties
            setFieldMappings(withoutColumn(mappings, activeCurrencyColumn));
            setCurrencyColumn(savedCurrencyColumn);

            // Set initial split mode based on any saved mapping
            // @ts-expect-error - mappings might not have outflow/inflow properties
            const splitMode = !!(mappings.outflow || mappings.inflow);
            setSplitMode(splitMode);

            // Inferred from rows the currency column keeps, so a left-out
            // row's date never decides the format.
            const parseDateFormat =
              prefs[`parse-date-${accountId}-${filetype}`] ||
              getInitialDateFormat(
                splitByCurrency(transactions, activeCurrencyColumn, accountCode)
                  .kept,
                mappings,
              );
            setParseDateFormat(
              isDateFormat(parseDateFormat) ? parseDateFormat : null,
            );
          }
        } else if (filetype === 'qif') {
          if (!preserveImportSettings) {
            const parseDateFormat =
              prefs[`parse-date-${accountId}-${filetype}`] ||
              getInitialDateFormat(transactions, { date: 'date' });
            setParseDateFormat(
              isDateFormat(parseDateFormat) ? parseDateFormat : null,
            );
          }
        } else {
          setFieldMappings(null);
          setParseDateFormat(null);
        }

        setParsedTransactions(transactions as ImportTransaction[]);
      }

      setLoadingState(null);
    },
    // We use some state variables from the component, but do not want to re-parse when they change
    [accountId, prefs, multicurrencyAvailable, accountCode],
  );

  function onMultiplierChange(e) {
    const amt = e;
    if (!amt || amt.match(/^\d{1,}(\.\d{0,4})?$/)) {
      setMultiplierAmount(amt);
    }
  }

  useEffect(() => {
    const fileType = getFileType(originalFileName);
    const parseOptions = getParseOptions(fileType, {
      delimiter,
      encoding: csvEncoding,
      hasHeaderRow,
      skipStartLines,
      skipEndLines,
      fallbackMissingPayeeToMemo,
      importNotes,
      swapPayeeAndMemo: getSwapOption(
        fileType,
        ofxSwapPayeeAndMemo,
        qifSwapPayeeAndMemo,
        camtSwapPayeeAndMemo,
      ),
    });
    const lastParse = lastParseRef.current;
    const shouldPreserveImportSettings = shouldPreserveImportSettingsForParse(
      lastParse,
      originalFileName,
      fileType,
      parseOptions,
    );

    lastParseRef.current = {
      filename: originalFileName,
      fileType,
      options: parseOptions,
    };

    void parse(originalFileName, parseOptions, {
      preserveImportSettings: shouldPreserveImportSettings,
    });
  }, [
    originalFileName,
    delimiter,
    csvEncoding,
    hasHeaderRow,
    skipStartLines,
    skipEndLines,
    fallbackMissingPayeeToMemo,
    importNotes,
    ofxSwapPayeeAndMemo,
    qifSwapPayeeAndMemo,
    camtSwapPayeeAndMemo,
    parse,
  ]);

  function onSplitMode() {
    if (fieldMappings == null) {
      return;
    }

    const isSplit = !splitMode;
    setSplitMode(isSplit);

    // Run auto-detection on the fields to try to detect the fields
    // automatically
    const mappings = getInitialMappings(transactions);

    const newFieldMappings = isSplit
      ? {
          amount: null,
          outflow: mappings.amount,
          inflow: null,
        }
      : {
          amount: mappings.amount,
          outflow: null,
          inflow: null,
        };
    setFieldMappings({ ...fieldMappings, ...newFieldMappings });
  }

  async function onNewFile() {
    const res = await window.Actual.openFileDialog({
      filters: [
        {
          name: 'Financial Files',
          extensions: ['qif', 'ofx', 'qfx', 'csv', 'tsv', 'xml'],
        },
      ],
    });

    const fileType = getFileType(res[0]);
    const parseOptions = getParseOptions(fileType, {
      delimiter,
      encoding: csvEncoding,
      hasHeaderRow,
      skipStartLines,
      skipEndLines,
      fallbackMissingPayeeToMemo,
      importNotes,
      swapPayeeAndMemo: getSwapOption(
        fileType,
        ofxSwapPayeeAndMemo,
        qifSwapPayeeAndMemo,
        camtSwapPayeeAndMemo,
      ),
    });

    void parse(res[0], parseOptions);
  }

  function onUpdateFields(field, name) {
    const newFieldMappings = {
      ...fieldMappings,
      [field]: name === '' ? null : name,
    };
    setFieldMappings(newFieldMappings);
  }

  function onCheckTransaction(trx_id: string) {
    const newTransactions = transactions.map(trans => {
      if (trans.trx_id === trx_id) {
        if (trans.existing) {
          // 3-states management for transactions with existing (merged transactions)
          // flow of states:
          // (selected true && selected_merge true)
          //   => (selected true && selected_merge false)
          //     => (selected false)
          //       => back to (selected true && selected_merge true)
          if (!trans.selected) {
            return {
              ...trans,
              selected: true,
              selected_merge: true,
            };
          } else if (trans.selected_merge) {
            return {
              ...trans,
              selected: true,
              selected_merge: false,
            };
          } else {
            return {
              ...trans,
              selected: false,
              selected_merge: false,
            };
          }
        } else {
          return {
            ...trans,
            selected: !trans.selected,
          };
        }
      }
      return trans;
    });

    setTransactions(newTransactions);
  }

  const importTransactions = useImportTransactionsMutation();

  async function onImport(close) {
    setLoadingState('importing');

    const finalTransactions = [];
    let errorMessage;

    // The current split again: a preview list from an older choice never
    // carries a row in another currency.
    const importSplit = splitByCurrency(
      transactions,
      effectiveCurrencyColumn,
      accountCode,
    );
    const leftOut = rejectedRows.length + importSplit.rejected.length;
    for (let trans of importSplit.kept) {
      if (
        trans.isMatchedTransaction ||
        (reconcile && !trans.selected && !trans.ignored && !trans.existing)
      ) {
        // skip transactions that are
        // - matched transaction (existing transaction added to show update changes)
        // - unselected transactions that are not ignored or merged by the reconcilation algorithm (only when reconcilation is enabled)
        continue;
      }

      trans = fieldMappings ? applyFieldMappings(trans, fieldMappings) : trans;

      const date =
        isOfxFile(filetype) || isCamtFile(filetype)
          ? trans.date
          : parseDate(trans.date, parseDateFormat);
      if (date == null) {
        errorMessage = t(
          'Unable to parse date {{date}} with given date format',
          { date: trans.date || t('(empty)') },
        );
        break;
      }

      const amount = parseImportAmount(
        trans,
        splitMode,
        isOfxFile(filetype) ? false : inOutMode,
        outValue,
        flipAmount,
        multiplierAmount,
        precision,
      );
      if (amount == null) {
        errorMessage = t('Transaction on {{date}} has no amount', {
          date: trans.date,
        });
        break;
      }

      const category_id = parseCategoryFields(trans, categories);

      const {
        inflow: _inflow,
        outflow: _outflow,
        inOut: _inOut,
        existing: _existing,
        ignored: _ignored,
        selected: _selected,
        selected_merge: _selected_merge,
        trx_id: _trx_id,
        base_amount: _baseAmount,
        ...finalTransaction
      } = trans;

      if (
        reconcile &&
        ((trans.ignored && trans.selected) ||
          (trans.existing && trans.selected && !trans.selected_merge))
      ) {
        // in reconcile mode, force transaction add for
        // - ignored transactions (aleardy existing) that are checked
        // - transactions with existing (merged transactions) that are not selected_merge
        finalTransaction.forceAddTransaction = true;
      }
      // Without merging, a foreign row is always added; the import path is
      // still used because it converts the amounts.
      if (!reconcile && isForeign) {
        finalTransaction.forceAddTransaction = true;
      }

      if (reconcile && trans.existing && !trans.selected) {
        // unselected transactions with existing are still sent, so they keep
        // their match and the other transactions match as in the preview
        finalTransaction.skipTransaction = true;
      }

      finalTransactions.push({
        ...finalTransaction,
        category: category_id,
        date,
        amount,
        cleared: clearOnImport,
        notes: importNotes ? finalTransaction.notes : null,
      });
    }

    if (errorMessage) {
      setLoadingState(null);
      setError({ parsed: false, message: errorMessage });
      return;
    }

    if (!isOfxFile(filetype) && !isCamtFile(filetype)) {
      const key = `parse-date-${accountId}-${filetype}`;
      savePrefs({ [key]: parseDateFormat });
    }

    if (isOfxFile(filetype)) {
      savePrefs({
        [`ofx-fallback-missing-payee-${accountId}`]: String(
          fallbackMissingPayeeToMemo,
        ),
        [`ofx-swap-payee-memo-${accountId}`]: String(ofxSwapPayeeAndMemo),
      });
    }

    if (filetype === 'csv') {
      savePrefs({
        [`csv-mappings-${accountId}`]: JSON.stringify(fieldMappings),
      });
      if (multicurrencyAvailable) {
        savePrefs({
          [`csv-currency-column-${accountId}`]: currencyColumn ?? '',
        });
      }
      savePrefs({ [`csv-delimiter-${accountId}`]: delimiter });
      savePrefs({ [`csv-encoding-${accountId}`]: csvEncoding });
      savePrefs({ [`csv-has-header-${accountId}`]: String(hasHeaderRow) });
      savePrefs({
        [`csv-skip-start-lines-${accountId}`]: String(skipStartLines),
      });
      savePrefs({ [`csv-skip-end-lines-${accountId}`]: String(skipEndLines) });
      savePrefs({ [`csv-in-out-mode-${accountId}`]: String(inOutMode) });
      savePrefs({ [`csv-out-value-${accountId}`]: String(outValue) });
    }

    if (filetype === 'csv' || filetype === 'qif') {
      savePrefs({
        [`flip-amount-${accountId}-${filetype}`]: String(flipAmount),
        [`import-notes-${accountId}-${filetype}`]: String(importNotes),
      });
    }

    if (filetype === 'qif') {
      savePrefs({
        [`qif-swap-payee-memo-${accountId}`]: String(qifSwapPayeeAndMemo),
      });
    }

    if (isCamtFile(filetype)) {
      savePrefs({
        [`camt-swap-payee-memo-${accountId}`]: String(camtSwapPayeeAndMemo),
      });
    }

    savePrefs({
      [`import-reimport-deleted-${accountId}`]: String(reimportDeleted),
    });

    importTransactions.mutate(
      {
        accountId,
        transactions: toImportRows(finalTransactions, isForeign),
        reconcile,
        reimportDeleted,
      },
      {
        // A thrown rejection (for example a guard error) also ends loading.
        onError: () => setLoadingState(null),
        onSuccess: async result => {
          // A rejected import wrote nothing; keep the dialog and its
          // settings so the user can supply what was missing.
          if (typeof result === 'object') {
            setLoadingState(null);
            setMissingRates(
              result.missingRateDates.map(date => ({ trxId: null, date })),
            );
            return;
          }
          const didChange = result;
          if (didChange) {
            void queryClient.invalidateQueries(payeeQueries.list());
          }

          if (onImported) {
            onImported(didChange);
          }
          if (leftOut > 0) {
            dispatch(
              addNotification({
                notification: {
                  type: 'message',
                  message: t(
                    'Rows left out because of their currency: {{count}}.',
                    { count: leftOut },
                  ),
                },
              }),
            );
          }

          close();
        },
      },
    );
  }

  const importPreviewTransactions = useImportPreviewTransactionsMutation();

  const onImportPreview = useEffectEvent(async () => {
    // Rows in another currency never reach the preview or the import, and
    // every one is listed, whatever its date.
    const { kept, rejected } = splitByCurrency(
      parsedTransactions,
      effectiveCurrencyColumn,
      accountCode,
    );
    // Filter by start date before preview and deduplication
    const isPreParsed = isOfxFile(filetype) || isCamtFile(filetype);
    const currencyKept = filterByStartDate(
      kept,
      startDate,
      isPreParsed,
      fieldMappings,
      parseDateFormat,
    );
    const splitKey = splitKeyOf(effectiveCurrencyColumn);

    // always start from the original parsed transactions, not the previewed ones to ensure rules run
    const requestId = ++previewRequestId.current;
    const previewRows = await getImportPreview(
      currencyKept,
      filetype,
      flipAmount,
      fieldMappings,
      splitMode,
      parseDateFormat,
      inOutMode,
      outValue,
      multiplierAmount,
    );
    // Without merging, foreign rows are added as new rows (see onImport).
    const previewTransactionsToImport =
      !reconcile && isForeign
        ? previewRows.map(row => ({ ...row, forceAddTransaction: true }))
        : previewRows;

    // Retreive the transactions that would be updated (along with the existing trx)
    importPreviewTransactions.mutate(
      {
        accountId,
        transactions: toImportRows(previewTransactionsToImport, isForeign),
        reimportDeleted,
      },
      {
        onSuccess: ({
          updatedPreview: previewTrx,
          previewBases,
          missingRateDates: missingDates,
          missingRates: rowRates,
        }) => {
          // A newer preview (after an option change) replaces this one.
          if (requestId !== previewRequestId.current) {
            return;
          }
          // The rows left out change together with the preview shown.
          setRejectedRows(rejected);
          setPreviewSplitKey(splitKey);
          setMissingRates(
            rowRates.length > 0
              ? rowRates
              : missingDates.map(date => ({ trxId: null, date })),
          );
          const matchedUpdateMap = previewTrx.reduce((map, entry) => {
            // @ts-expect-error - entry.transaction might not have trx_id property
            map[entry.transaction.trx_id] = entry;
            return map;
          }, {});
          // Base amounts resolved for new rows of a foreign account.
          const baseByTrxId = new Map(
            previewBases.map(entry => [
              // @ts-expect-error - entry.transaction might not have trx_id property
              entry.transaction.trx_id,
              entry.baseAmount,
            ]),
          );

          const previewTransactions = currencyKept
            .filter(trans => !trans.isMatchedTransaction)
            .reduce((previous, currentTrx) => {
              let next = previous;
              const entry = matchedUpdateMap[currentTrx.trx_id];
              const existingTrx = entry?.existing;

              // if the transaction is matched with an existing one for update
              currentTrx.existing = !!existingTrx;
              // if the transaction is an update that will be ignored
              // (reconciled transactions or no change detected)
              currentTrx.ignored = entry?.ignored || false;

              currentTrx.tombstone = entry?.tombstone || false;

              currentTrx.selected = !currentTrx.ignored;
              currentTrx.selected_merge = currentTrx.existing;
              // Display only; stripped before rows are sent to the server.
              const baseAmount = baseByTrxId.get(currentTrx.trx_id);
              if (baseAmount !== undefined) {
                currentTrx.base_amount = baseAmount;
              } else {
                delete currentTrx.base_amount;
              }

              next = next.concat({ ...currentTrx });

              if (existingTrx) {
                // add the updated existing transaction in the list, with the
                // isMatchedTransaction flag to identify it in display and not send it again
                existingTrx.isMatchedTransaction = true;
                existingTrx.category = categories.find(
                  cat => cat.id === existingTrx.category,
                )?.name;
                // add parent transaction attribute to mimic behaviour
                existingTrx.trx_id = currentTrx.trx_id;
                existingTrx.existing = currentTrx.existing;
                existingTrx.selected = currentTrx.selected;
                existingTrx.selected_merge = currentTrx.selected_merge;

                next = next.concat({ ...existingTrx });
              }

              return next;
            }, []);

          setTransactions(previewTransactions);
        },
      },
    );
  });

  useEffect(() => {
    if (parsedTransactions.length === 0 || loadingState === 'parsing') {
      return;
    }

    void onImportPreview();
  }, [
    rateVersion,
    loadingState,
    parsedTransactions.length,
    startDate,
    fieldMappings,
    parseDateFormat,
    reimportDeleted,
    // Amount interpretation changes the resolved base amounts.
    flipAmount,
    multiplierAmount,
    inOutMode,
    outValue,
    reconcile,
    effectiveCurrencyColumn,
    accountCode,
  ]);

  // Only rows selected for import need a rate.
  const selectedIds = new Set(
    transactions
      .filter(trans => trans.selected && !trans.isMatchedTransaction)
      .map(trans => trans.trx_id),
  );
  const blockingRateDates = [
    ...new Set(
      missingRates
        .filter(({ trxId }) => trxId === null || selectedIds.has(trxId))
        .map(({ date }) => date),
    ),
  ].sort();

  const headers: ComponentProps<typeof TableHeader>['headers'] = [
    { name: t('Date'), width: 200 },
    { name: t('Payee'), width: 'flex' },
    { name: t('Notes'), width: 'flex' },
    { name: t('Category'), width: 'flex' },
  ];

  if (reconcile) {
    headers.unshift({ name: ' ', width: 31 });
  }
  if (inOutMode) {
    headers.push({
      name: t('In/Out'),
      width: 90,
      style: { textAlign: 'left' },
    });
  }
  if (splitMode) {
    headers.push({
      name: t('Outflow'),
      width: 90,
      style: { textAlign: 'right' },
    });
    headers.push({
      name: t('Inflow'),
      width: 90,
      style: { textAlign: 'right' },
    });
  } else {
    headers.push({
      name: t('Amount'),
      width: 90,
      style: { textAlign: 'right' },
    });
  }

  return (
    <Modal
      name="import-transactions"
      isLoading={loadingState === 'parsing'}
      containerProps={{ style: { width: 800 } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={
              t('Import transactions') +
              (filetype ? ` (${filetype.toUpperCase()})` : '')
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          {error && !error.parsed && (
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ marginRight: 10, color: theme.errorText }}>
                <strong>
                  <Trans>Error:</Trans>
                </strong>{' '}
                {error.message}
              </Text>
            </View>
          )}
          {isForeign && currencyCode && blockingRateDates.length > 0 && (
            <MissingRateForm
              dates={blockingRateDates}
              currencyCode={currencyCode}
              onSaved={() => setRateVersion(version => version + 1)}
            />
          )}
          {(!error || !error.parsed) && (
            <View
              style={{ ...styles.tableContainer, height: 300, flex: 'unset' }}
            >
              <TableHeader headers={headers} />

              {/* @ts-expect-error - ImportTransaction is not a TableItem */}
              <TableWithNavigator<ImportTransaction>
                items={transactions.filter(
                  trans =>
                    !trans.isMatchedTransaction ||
                    (trans.isMatchedTransaction && reconcile),
                )}
                fields={['payee', 'category', 'amount']}
                style={{ backgroundColor: theme.tableHeaderBackground }}
                getItemKey={index => String(index)}
                renderEmpty={() => {
                  return (
                    <View
                      style={{
                        textAlign: 'center',
                        marginTop: 25,
                        color: theme.tableHeaderText,
                        fontStyle: 'italic',
                      }}
                    >
                      <Trans>No transactions found</Trans>
                    </View>
                  );
                }}
                renderItem={({ item, index }) => (
                  <View>
                    <Transaction
                      transaction={item}
                      index={index}
                      showParsed={filetype === 'csv' || filetype === 'qif'}
                      parseDateFormat={parseDateFormat}
                      dateFormat={dateFormat}
                      fieldMappings={fieldMappings}
                      splitMode={splitMode}
                      inOutMode={inOutMode}
                      outValue={outValue}
                      flipAmount={flipAmount}
                      multiplierAmount={multiplierAmount}
                      precision={precision}
                      categories={categories}
                      onCheckTransaction={onCheckTransaction}
                      reconcile={reconcile}
                    />
                  </View>
                )}
              />
            </View>
          )}
          {error && error.parsed && (
            <View
              style={{
                color: theme.errorText,
                alignItems: 'center',
                marginTop: 10,
              }}
            >
              <Text style={{ maxWidth: 450, marginBottom: 15 }}>
                <strong>Error:</strong> {error.message}
              </Text>
              {error.parsed && (
                <Button onPress={() => onNewFile()}>
                  <Trans>Select new file...</Trans>
                </Button>
              )}
            </View>
          )}

          <View
            style={{
              marginTop: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <label
              htmlFor="start-date-filter"
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 5,
                alignItems: 'baseline',
              }}
            >
              <Trans>Only import transactions since:</Trans>
              <Input
                id="start-date-filter"
                type="date"
                value={startDate}
                onChangeValue={value => setStartDate(value)}
                style={{ width: 150 }}
              />
            </label>
            {startDate && (
              <Button onPress={() => setStartDate('')}>
                <Trans>Clear</Trans>
              </Button>
            )}
          </View>

          {filetype === 'csv' && (
            <View style={{ marginTop: 10 }}>
              <FieldMappings
                transactions={transactions}
                onChange={onUpdateFields}
                mappings={fieldMappings || undefined}
                splitMode={splitMode}
                inOutMode={inOutMode}
                hasHeaderRow={hasHeaderRow}
              />
            </View>
          )}

          {/* Kept mounted from the parsed rows, even when every row is left out. */}
          {filetype === 'csv' &&
            multicurrencyAvailable &&
            parsedTransactions.length > 0 && (
              <View
                role="group"
                aria-label={t('Currency column')}
                style={{ marginTop: 10, maxWidth: 240 }}
              >
                <SubLabel title={t('Currency')} />
                <SelectField
                  options={csvColumns}
                  value={effectiveCurrencyColumn}
                  onChange={name => {
                    const column = currencyColumnOf(name);
                    setCurrencyColumn(column);
                    setFieldMappings(mappings =>
                      mappings ? withoutColumn(mappings, column) : mappings,
                    );
                  }}
                  hasHeaderRow={hasHeaderRow}
                  firstTransaction={parsedTransactions[0]}
                />
              </View>
            )}

          {rejectedRows.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: theme.warningText }}>
                <Trans>Rows left out because of their currency:</Trans>
              </Text>
              <View style={{ maxHeight: 150, overflowY: 'auto' }}>
                {rejectedRows.map(({ row, value }) => {
                  const mapped = fieldMappings
                    ? applyFieldMappings(row, fieldMappings)
                    : row;
                  return (
                    <Text
                      key={row.trx_id}
                      style={{ color: theme.pageTextSubdued }}
                    >
                      {[
                        mapped.date,
                        mapped.payee_name || mapped.notes,
                        // Separate columns show each cell the file fills.
                        ...(splitMode
                          ? [
                              String(mapped.outflow ?? '').trim() &&
                                t('Outflow {{value}}', {
                                  value: mapped.outflow,
                                }),
                              String(mapped.inflow ?? '').trim() &&
                                t('Inflow {{value}}', { value: mapped.inflow }),
                            ]
                          : [mapped.amount]),
                      ]
                        .filter(part => part != null && part !== '')
                        .join(' · ')}{' '}
                      {t(
                        "Currency {{value}} does not match this account's {{code}}",
                        {
                          value,
                          code: accountCode,
                        },
                      )}
                    </Text>
                  );
                })}
              </View>
            </View>
          )}

          {isOfxFile(filetype) && (
            <>
              <CheckboxToggle
                id="form_fallback_missing_payee"
                checked={fallbackMissingPayeeToMemo}
                onChange={setFallbackMissingPayeeToMemo}
              >
                <Trans>Use Memo as a fallback for empty Payees</Trans>
              </CheckboxToggle>
              <CheckboxToggle
                id="form_ofx_swap_payee_memo"
                checked={ofxSwapPayeeAndMemo}
                onChange={setOfxSwapPayeeAndMemo}
              >
                <Trans>Swap Payee and Memo</Trans>
              </CheckboxToggle>
            </>
          )}

          {filetype !== 'csv' && (
            <CheckboxToggle
              id="import_notes"
              checked={importNotes}
              onChange={setImportNotes}
            >
              <Trans>Import notes from file</Trans>
            </CheckboxToggle>
          )}

          {filetype === 'qif' && (
            <CheckboxToggle
              id="form_qif_swap_payee_memo"
              checked={qifSwapPayeeAndMemo}
              onChange={setQifSwapPayeeAndMemo}
            >
              <Trans>Swap Payee and Memo</Trans>
            </CheckboxToggle>
          )}

          {isCamtFile(filetype) && (
            <CheckboxToggle
              id="form_camt_swap_payee_memo"
              checked={camtSwapPayeeAndMemo}
              onChange={setCamtSwapPayeeAndMemo}
            >
              <Trans>Swap Payee and Memo</Trans>
            </CheckboxToggle>
          )}

          {(isOfxFile(filetype) || isCamtFile(filetype)) && (
            <CheckboxToggle
              id="form_dont_reconcile"
              checked={reconcile}
              onChange={setReconcile}
            >
              <Trans>Merge with existing transactions</Trans>
            </CheckboxToggle>
          )}

          {(isOfxFile(filetype) || isCamtFile(filetype)) && reconcile && (
            <CheckboxToggle
              id="form_reimport_deleted"
              checked={reimportDeleted}
              onChange={setReimportDeleted}
            >
              <Trans>Reimport deleted transactions</Trans>
            </CheckboxToggle>
          )}

          {/*Import Options */}
          {(filetype === 'qif' || filetype === 'csv') && (
            <View style={{ marginTop: 10 }}>
              <SpaceBetween
                gap={5}
                style={{ marginTop: 5, alignItems: 'flex-start' }}
              >
                {/* Date Format */}
                <View>
                  {(filetype === 'qif' || filetype === 'csv') && (
                    <DateFormatSelect
                      transactions={transactions}
                      fieldMappings={fieldMappings || undefined}
                      parseDateFormat={parseDateFormat || undefined}
                      onChange={value => {
                        setParseDateFormat(isDateFormat(value) ? value : null);
                      }}
                    />
                  )}
                </View>

                {/* CSV Options */}
                {filetype === 'csv' && (
                  <View style={{ marginLeft: 10, gap: 5 }}>
                    <SectionLabel title={t('CSV OPTIONS')} />
                    <label
                      htmlFor="csv-delimiter-select"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 5,
                        alignItems: 'baseline',
                      }}
                    >
                      <Trans>Delimiter:</Trans>
                      <Select
                        id="csv-delimiter-select"
                        options={[
                          [',', ','],
                          [';', ';'],
                          ['|', '|'],
                          ['\t', 'tab'],
                          ['~', '~'],
                        ]}
                        value={delimiter}
                        onChange={value => {
                          setDelimiter(value);
                        }}
                        style={{ width: 50 }}
                      />
                    </label>
                    <label
                      htmlFor="csv-encoding-select"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 5,
                        alignItems: 'baseline',
                      }}
                    >
                      <Trans>Encoding:</Trans>
                      <Select
                        id="csv-encoding-select"
                        options={[
                          ['auto', t('Auto (detect)')],
                          ['utf-8', t('UTF-8')],
                          ['utf-16le', t('UTF-16 LE')],
                          ['utf-16be', t('UTF-16 BE')],
                          ['windows-1252', t('Windows-1252')],
                          ['windows-1250', t('Windows-1250')],
                          ['iso-8859-2', t('ISO-8859-2')],
                        ]}
                        value={csvEncoding}
                        onChange={value => {
                          setCsvEncoding(value);
                        }}
                        style={{ width: 130 }}
                      />
                    </label>
                    <label
                      htmlFor="csv-skip-start-lines"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 5,
                        alignItems: 'baseline',
                      }}
                    >
                      <Trans>Skip start lines:</Trans>
                      <Input
                        id="csv-skip-start-lines"
                        type="number"
                        value={skipStartLines}
                        min="0"
                        step="1"
                        onChangeValue={value => {
                          setSkipStartLines(Math.abs(parseInt(value, 10) || 0));
                        }}
                        style={{ width: 50 }}
                      />
                    </label>
                    <label
                      htmlFor="csv-skip-end-lines"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 5,
                        alignItems: 'baseline',
                      }}
                    >
                      <Trans>Skip end lines:</Trans>
                      <Input
                        id="csv-skip-end-lines"
                        type="number"
                        value={skipEndLines}
                        min="0"
                        step="1"
                        onChangeValue={value => {
                          setSkipEndLines(Math.abs(parseInt(value, 10) || 0));
                        }}
                        style={{ width: 50 }}
                      />
                    </label>
                    <CheckboxToggle
                      id="form_has_header"
                      checked={hasHeaderRow}
                      onChange={setHasHeaderRow}
                    >
                      <Trans>File has header row</Trans>
                    </CheckboxToggle>
                    <CheckboxToggle
                      id="clear_on_import"
                      checked={clearOnImport}
                      onChange={setClearOnImport}
                    >
                      <Trans>Clear transactions on import</Trans>
                    </CheckboxToggle>
                    <CheckboxToggle
                      id="form_dont_reconcile"
                      checked={reconcile}
                      onChange={setReconcile}
                    >
                      <Trans>Merge with existing transactions</Trans>
                    </CheckboxToggle>
                    {reconcile && (
                      <CheckboxToggle
                        id="form_reimport_deleted_csv"
                        checked={reimportDeleted}
                        onChange={setReimportDeleted}
                      >
                        <Trans>Reimport deleted transactions</Trans>
                      </CheckboxToggle>
                    )}
                  </View>
                )}

                <View style={{ flex: 1 }} />

                <View style={{ marginRight: 10, gap: 5 }}>
                  <SectionLabel title={t('AMOUNT OPTIONS')} />
                  <CheckboxToggle
                    id="form_flip"
                    checked={flipAmount}
                    onChange={setFlipAmount}
                  >
                    <Trans>Flip amount</Trans>
                  </CheckboxToggle>
                  <MultiplierOption
                    multiplierEnabled={multiplierEnabled}
                    multiplierAmount={multiplierAmount}
                    onToggle={() => {
                      setMultiplierEnabled(!multiplierEnabled);
                      setMultiplierAmount('');
                    }}
                    onChangeAmount={onMultiplierChange}
                  />
                  {filetype === 'csv' && (
                    <>
                      <LabeledCheckbox
                        id="form_split"
                        checked={splitMode}
                        onChange={() => {
                          onSplitMode();
                        }}
                      >
                        <Trans>
                          Split amount into separate inflow/outflow columns
                        </Trans>
                      </LabeledCheckbox>
                      <InOutOption
                        inOutMode={inOutMode}
                        outValue={outValue}
                        onToggle={() => {
                          setInOutMode(!inOutMode);
                        }}
                        onChangeText={setOutValue}
                      />
                    </>
                  )}
                </View>
              </SpaceBetween>
            </View>
          )}

          <View style={{ flexDirection: 'row', marginTop: 5 }}>
            {/*Submit Button */}
            <View
              style={{
                alignSelf: 'flex-end',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '1em',
              }}
            >
              {(() => {
                const count = transactions?.filter(
                  trans =>
                    !trans.isMatchedTransaction &&
                    trans.selected &&
                    !trans.tombstone,
                ).length;

                return (
                  <ButtonWithLoading
                    variant="primary"
                    autoFocus
                    // A preview in flight may change which rows are left out.
                    isDisabled={
                      count === 0 ||
                      blockingRateDates.length > 0 ||
                      importPreviewTransactions.isPending ||
                      // A preview from another column or code (for example
                      // after a failed refresh) is not what Import sends.
                      previewSplitKey !== splitKeyOf(effectiveCurrencyColumn)
                    }
                    isLoading={loadingState === 'importing'}
                    onPress={() => {
                      void onImport(() => state.close());
                    }}
                  >
                    <Trans count={count}>Import {{ count }} transactions</Trans>
                  </ButtonWithLoading>
                );
              })()}
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}

function getParseOptions(fileType: string, options: ParseFileOptions = {}) {
  if (fileType === 'csv') {
    const { delimiter, encoding, hasHeaderRow, skipStartLines, skipEndLines } =
      options;
    return { delimiter, encoding, hasHeaderRow, skipStartLines, skipEndLines };
  }
  if (isOfxFile(fileType)) {
    const { fallbackMissingPayeeToMemo, importNotes, swapPayeeAndMemo } =
      options;
    return { fallbackMissingPayeeToMemo, importNotes, swapPayeeAndMemo };
  }
  if (fileType === 'qif') {
    const { importNotes, swapPayeeAndMemo } = options;
    return { importNotes, swapPayeeAndMemo };
  }
  if (isCamtFile(fileType)) {
    const { importNotes, swapPayeeAndMemo } = options;
    return { importNotes, swapPayeeAndMemo };
  }
  const { importNotes } = options;
  return { importNotes };
}

function getSwapOption(
  fileType: string,
  ofxSwapPayeeAndMemo: boolean,
  qifSwapPayeeAndMemo: boolean,
  camtSwapPayeeAndMemo: boolean,
) {
  if (isOfxFile(fileType)) {
    return ofxSwapPayeeAndMemo;
  }

  if (fileType === 'qif') {
    return qifSwapPayeeAndMemo;
  }

  if (isCamtFile(fileType)) {
    return camtSwapPayeeAndMemo;
  }

  return false;
}

function isOfxFile(fileType: string) {
  return fileType === 'ofx' || fileType === 'qfx';
}

function isCamtFile(fileType: string) {
  return fileType === 'xml';
}

/**
 * A foreign account's rows carry their parsed amount as the native
 * `transaction_amount`; the server converts it at the saved rate.
 */
export function toImportRows(
  rows: ImportRow[],
  isForeign: boolean,
): ImportRow[] {
  if (!isForeign) return rows;
  return rows.map(({ amount, ...rest }) => ({
    ...rest,
    transaction_amount: amount,
  }));
}
