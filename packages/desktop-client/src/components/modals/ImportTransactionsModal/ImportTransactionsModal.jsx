import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import deepEqual from 'deep-equal';

import {
  getPayees,
  importPreviewTransactions,
  importTransactions,
} from 'loot-core/client/queries/queriesSlice';
import { send } from 'loot-core/platform/client/fetch';
import { amountToInteger } from 'loot-core/src/shared/util';

import { useCategories } from '../../../hooks/useCategories';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { useSyncedPrefs } from '../../../hooks/useSyncedPrefs';
import { useDispatch } from '../../../redux';
import { theme } from '../../../style';
import { Button, ButtonWithLoading } from '../../common/Button2';
import { Input } from '../../common/Input';
import { Modal, ModalCloseButton, ModalHeader } from '../../common/Modal';
import { Select } from '../../common/Select';
import { Stack } from '../../common/Stack';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { SectionLabel } from '../../forms';
import { TableHeader, TableWithNavigator } from '../../table';

import { CheckboxOption } from './CheckboxOption';
import { DateFormatSelect } from './DateFormatSelect';
import { FieldMappings } from './FieldMappings';
import { InOutOption } from './InOutOption';
import { MultiplierOption } from './MultiplierOption';
import { Transaction } from './Transaction';
import {
  applyFieldMappings,
  dateFormats,
  parseAmountFields,
  parseDate,
  stripCsvImportTransaction,
} from './utils';

function getFileType(filepath) {
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

function parseCategoryFields(trans, categories) {
  let match = null;
  categories.forEach(category => {
    if (category.id === trans.category) {
      return null;
    }
    if (category.name === trans.category) {
      match = category.id;
    }
  });
  return match;
}

export function ImportTransactionsModal({
  filename: originalFileName,
  accountId,
  onImported,
}) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [prefs, savePrefs] = useSyncedPrefs();
  const dispatch = useDispatch();
  const categories = useCategories();

  const [multiplierAmount, setMultiplierAmount] = useState('');
  const [loadingState, setLoadingState] = useState('parsing');
  const [error, setError] = useState(null);
  const [filename, setFilename] = useState(originalFileName);
  const [transactions, setTransactions] = useState([]);
  const [filetype, setFileType] = useState(null);
  const [fieldMappings, setFieldMappings] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [flipAmount, setFlipAmount] = useState(false);
  const [multiplierEnabled, setMultiplierEnabled] = useState(false);
  const [reconcile, setReconcile] = useState(true);

  // This cannot be set after parsing the file, because changing it
  // requires re-parsing the file. This is different from the other
  // options which are simple post-processing. That means if you
  // parsed different files without closing the modal, it wouldn't
  // re-read this.
  const [delimiter, setDelimiter] = useState(
    prefs[`csv-delimiter-${accountId}`] ||
      (filename.endsWith('.tsv') ? '\t' : ','),
  );
  const [skipLines, setSkipLines] = useState(
    parseInt(prefs[`csv-skip-lines-${accountId}`], 10) || 0,
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

  const [parseDateFormat, setParseDateFormat] = useState(null);

  const [clearOnImport, setClearOnImport] = useState(true);

  const getImportPreview = useCallback(
    async (
      transactions,
      filetype,
      flipAmount,
      fieldMappings,
      splitMode,
      parseDateFormat,
      inOutMode,
      outValue,
      multiplierAmount,
    ) => {
      const previewTransactions = [];

      for (let trans of transactions) {
        if (trans.isMatchedTransaction) {
          // skip transactions that are matched transaction (existing transaction added to show update changes)
          continue;
        }

        trans = fieldMappings
          ? applyFieldMappings(trans, fieldMappings)
          : trans;

        const date = isOfxFile(filetype)
          ? trans.date
          : parseDate(trans.date, parseDateFormat);
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

        const { amount } = parseAmountFields(
          trans,
          splitMode,
          inOutMode,
          outValue,
          flipAmount,
          multiplierAmount,
        );
        if (amount == null) {
          console.log(`Transaction on ${trans.date} has no amount`);
          break;
        }

        const category_id = parseCategoryFields(trans, categories.list);
        if (category_id != null) {
          trans.category = category_id;
        }

        const {
          inflow,
          outflow,
          inOut,
          existing,
          ignored,
          selected,
          selected_merge,
          ...finalTransaction
        } = trans;
        previewTransactions.push({
          ...finalTransaction,
          date,
          amount: amountToInteger(amount),
          cleared: clearOnImport,
        });
      }

      // Retreive the transactions that would be updated (along with the existing trx)
      const previewTrx = await dispatch(
        importPreviewTransactions({
          accountId,
          transactions: previewTransactions,
        }),
      ).unwrap();
      const matchedUpdateMap = previewTrx.reduce((map, entry) => {
        map[entry.transaction.trx_id] = entry;
        return map;
      }, {});

      return transactions
        .filter(trans => !trans.isMatchedTransaction)
        .reduce((previous, current_trx) => {
          let next = previous;
          const entry = matchedUpdateMap[current_trx.trx_id];
          const existing_trx = entry?.existing;

          // if the transaction is matched with an existing one for update
          current_trx.existing = !!existing_trx;
          // if the transaction is an update that will be ignored
          // (reconciled transactions or no change detected)
          current_trx.ignored = entry?.ignored || false;

          current_trx.selected = !current_trx.ignored;
          current_trx.selected_merge = current_trx.existing;

          next = next.concat({ ...current_trx });

          if (existing_trx) {
            // add the updated existing transaction in the list, with the
            // isMatchedTransaction flag to identify it in display and not send it again
            existing_trx.isMatchedTransaction = true;
            existing_trx.category = categories.list.find(
              cat => cat.id === existing_trx.category,
            )?.name;
            // add parent transaction attribute to mimic behaviour
            existing_trx.trx_id = current_trx.trx_id;
            existing_trx.existing = current_trx.existing;
            existing_trx.selected = current_trx.selected;
            existing_trx.selected_merge = current_trx.selected_merge;

            next = next.concat({ ...existing_trx });
          }

          return next;
        }, []);
    },
    [accountId, categories.list, clearOnImport, dispatch],
  );

  const parse = useCallback(
    async (filename, options) => {
      setLoadingState('parsing');

      const filetype = getFileType(filename);
      setFilename(filename);
      setFileType(filetype);

      const { errors, transactions: parsedTransactions = [] } = await send(
        'transactions-parse-file',
        {
          filepath: filename,
          options,
        },
      );

      let index = 0;
      const transactions = parsedTransactions.map(trans => {
        // Add a transient transaction id to match preview with imported transactions
        trans.trx_id = index++;
        // Select all parsed transactions before first preview run
        trans.selected = true;
        return trans;
      });

      setLoadingState(null);
      setError(null);

      /// Do fine grained reporting between the old and new OFX importers.
      if (errors.length > 0) {
        setError({
          parsed: true,
          message: errors[0].message || 'Internal error',
        });
      } else {
        let flipAmount = false;
        let fieldMappings = null;
        let splitMode = false;
        let parseDateFormat = null;

        if (filetype === 'csv' || filetype === 'qif') {
          flipAmount =
            String(prefs[`flip-amount-${accountId}-${filetype}`]) === 'true';
          setFlipAmount(flipAmount);
        }

        if (filetype === 'csv') {
          let mappings = prefs[`csv-mappings-${accountId}`];
          mappings = mappings
            ? JSON.parse(mappings)
            : getInitialMappings(transactions);

          fieldMappings = mappings;
          setFieldMappings(mappings);

          // Set initial split mode based on any saved mapping
          splitMode = !!(mappings.outflow || mappings.inflow);
          setSplitMode(splitMode);

          parseDateFormat =
            prefs[`parse-date-${accountId}-${filetype}`] ||
            getInitialDateFormat(transactions, mappings);
          setParseDateFormat(parseDateFormat);
        } else if (filetype === 'qif') {
          parseDateFormat =
            prefs[`parse-date-${accountId}-${filetype}`] ||
            getInitialDateFormat(transactions, { date: 'date' });
          setParseDateFormat(parseDateFormat);
        } else {
          setFieldMappings(null);
          setParseDateFormat(null);
        }

        // Reverse the transactions because it's very common for them to
        // be ordered ascending, but we show transactions descending by
        // date. This is purely cosmetic.
        const transactionPreview = await getImportPreview(
          transactions.reverse(),
          filetype,
          flipAmount,
          fieldMappings,
          splitMode,
          parseDateFormat,
          inOutMode,
          outValue,
          multiplierAmount,
        );
        setTransactions(transactionPreview);
      }
    },
    [accountId, getImportPreview, inOutMode, multiplierAmount, outValue, prefs],
  );

  function onMultiplierChange(e) {
    const amt = e;
    if (!amt || amt.match(/^\d{1,}(\.\d{0,4})?$/)) {
      setMultiplierAmount(amt);
      runImportPreview();
    }
  }

  useEffect(() => {
    const fileType = getFileType(originalFileName);
    const parseOptions = getParseOptions(fileType, {
      delimiter,
      hasHeaderRow,
      skipLines,
      fallbackMissingPayeeToMemo,
    });

    parse(originalFileName, parseOptions);
  }, [
    originalFileName,
    delimiter,
    hasHeaderRow,
    skipLines,
    fallbackMissingPayeeToMemo,
    parse,
  ]);

  function onSplitMode() {
    if (fieldMappings == null) {
      return;
    }

    if (flipAmount === true) {
      setFlipAmount(!flipAmount);
    }

    const isSplit = !splitMode;
    setSplitMode(isSplit);
    setInOutMode(false);
    setFlipAmount(false);

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
      hasHeaderRow,
      skipLines,
      fallbackMissingPayeeToMemo,
    });

    parse(res[0], parseOptions);
  }

  function onUpdateFields(field, name) {
    const newFieldMappings = {
      ...fieldMappings,
      [field]: name === '' ? null : name,
    };
    setFieldMappings(newFieldMappings);
    runImportPreview();
  }

  function onCheckTransaction(trx_id) {
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

  async function onImport(close) {
    setLoadingState('importing');

    const finalTransactions = [];
    let errorMessage;

    for (let trans of transactions) {
      if (
        trans.isMatchedTransaction ||
        (reconcile && !trans.selected && !trans.ignored)
      ) {
        // skip transactions that are
        // - matched transaction (existing transaction added to show update changes)
        // - unselected transactions that are not ignored by the reconcilation algorithm (only when reconcilation is enabled)
        continue;
      }

      trans = fieldMappings ? applyFieldMappings(trans, fieldMappings) : trans;

      const date =
        isOfxFile(filetype) || isCamtFile(filetype)
          ? trans.date
          : parseDate(trans.date, parseDateFormat);
      if (date == null) {
        errorMessage = `Unable to parse date ${
          trans.date || '(empty)'
        } with given date format`;
        break;
      }

      const { amount } = parseAmountFields(
        trans,
        splitMode,
        inOutMode,
        outValue,
        flipAmount,
        multiplierAmount,
      );
      if (amount == null) {
        errorMessage = `Transaction on ${trans.date} has no amount`;
        break;
      }

      const category_id = parseCategoryFields(trans, categories.list);
      trans.category = category_id;

      const {
        inflow,
        outflow,
        inOut,
        existing,
        ignored,
        selected,
        selected_merge,
        trx_id,
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

      finalTransactions.push({
        ...finalTransaction,
        date,
        amount: amountToInteger(amount),
        cleared: clearOnImport,
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
      });
    }

    if (filetype === 'csv') {
      savePrefs({
        [`csv-mappings-${accountId}`]: JSON.stringify(fieldMappings),
      });
      savePrefs({ [`csv-delimiter-${accountId}`]: delimiter });
      savePrefs({ [`csv-has-header-${accountId}`]: String(hasHeaderRow) });
      savePrefs({ [`csv-skip-lines-${accountId}`]: String(skipLines) });
      savePrefs({ [`csv-in-out-mode-${accountId}`]: String(inOutMode) });
      savePrefs({ [`csv-out-value-${accountId}`]: String(outValue) });
    }

    if (filetype === 'csv' || filetype === 'qif') {
      savePrefs({
        [`flip-amount-${accountId}-${filetype}`]: String(flipAmount),
      });
    }

    const didChange = await dispatch(
      importTransactions({
        accountId,
        transactions: finalTransactions,
        reconcile,
      }),
    ).unwrap();
    if (didChange) {
      await dispatch(getPayees());
    }

    if (onImported) {
      onImported(didChange);
    }
    close();
  }

  const runImportPreview = useCallback(async () => {
    const transactionPreview = await getImportPreview(
      transactions,
      filetype,
      flipAmount,
      fieldMappings,
      splitMode,
      parseDateFormat,
      inOutMode,
      outValue,
      multiplierAmount,
    );

    if (!deepEqual(transactions, transactionPreview)) {
      setTransactions(transactionPreview);
    }
  }, [
    getImportPreview,
    transactions,
    filetype,
    flipAmount,
    fieldMappings,
    splitMode,
    parseDateFormat,
    inOutMode,
    outValue,
    multiplierAmount,
  ]);

  const headers = [
    { name: 'Date', width: 200 },
    { name: 'Payee', width: 'flex' },
    { name: 'Notes', width: 'flex' },
    { name: 'Category', width: 'flex' },
  ];

  if (reconcile) {
    headers.unshift({ name: ' ', width: 31 });
  }
  if (inOutMode) {
    headers.push({ name: 'In/Out', width: 90, style: { textAlign: 'left' } });
  }
  if (splitMode) {
    headers.push({ name: 'Outflow', width: 90, style: { textAlign: 'right' } });
    headers.push({ name: 'Inflow', width: 90, style: { textAlign: 'right' } });
  } else {
    headers.push({ name: 'Amount', width: 90, style: { textAlign: 'right' } });
  }

  return (
    <Modal
      name="import-transactions"
      isLoading={loadingState === 'parsing'}
      containerProps={{ style: { width: 800 } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              t('Import transactions') +
              (filetype ? ` (${filetype.toUpperCase()})` : '')
            }
            rightContent={<ModalCloseButton onPress={close} />}
          />
          {error && !error.parsed && (
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ marginRight: 10, color: theme.errorText }}>
                <strong>Error:</strong> {error.message}
              </Text>
            </View>
          )}
          {(!error || !error.parsed) && (
            <View
              style={{
                flex: 'unset',
                height: 300,
                border: '1px solid ' + theme.tableBorder,
              }}
            >
              <TableHeader headers={headers} />

              <TableWithNavigator
                items={transactions.filter(
                  trans =>
                    !trans.isMatchedTransaction ||
                    (trans.isMatchedTransaction && reconcile),
                )}
                fields={['payee', 'category', 'amount']}
                style={{ backgroundColor: theme.tableHeaderBackground }}
                getItemKey={index => index}
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
                      {t('No transactions found')}
                    </View>
                  );
                }}
                renderItem={({ key, style, item }) => (
                  <View key={key} style={style}>
                    <Transaction
                      transaction={item}
                      showParsed={filetype === 'csv' || filetype === 'qif'}
                      parseDateFormat={parseDateFormat}
                      dateFormat={dateFormat}
                      fieldMappings={fieldMappings}
                      splitMode={splitMode}
                      inOutMode={inOutMode}
                      outValue={outValue}
                      flipAmount={flipAmount}
                      multiplierAmount={multiplierAmount}
                      categories={categories.list}
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
                  {t('Select new file...')}
                </Button>
              )}
            </View>
          )}

          {filetype === 'csv' && (
            <View style={{ marginTop: 10 }}>
              <FieldMappings
                transactions={transactions}
                onChange={onUpdateFields}
                mappings={fieldMappings}
                splitMode={splitMode}
                inOutMode={inOutMode}
                hasHeaderRow={hasHeaderRow}
              />
            </View>
          )}

          {isOfxFile(filetype) && (
            <CheckboxOption
              id="form_fallback_missing_payee"
              checked={fallbackMissingPayeeToMemo}
              onChange={() => {
                setFallbackMissingPayeeToMemo(state => !state);
                parse(
                  filename,
                  getParseOptions('ofx', {
                    fallbackMissingPayeeToMemo: !fallbackMissingPayeeToMemo,
                  }),
                );
              }}
            >
              {t('Use Memo as a fallback for empty Payees')}
            </CheckboxOption>
          )}
          {(isOfxFile(filetype) || isCamtFile(filetype)) && (
            <CheckboxOption
              id="form_dont_reconcile"
              checked={reconcile}
              onChange={() => {
                setReconcile(!reconcile);
              }}
            >
              {t('Merge with existing transactions')}
            </CheckboxOption>
          )}

          {/*Import Options */}
          {(filetype === 'qif' || filetype === 'csv') && (
            <View style={{ marginTop: 10 }}>
              <Stack
                direction="row"
                align="flex-start"
                spacing={1}
                style={{ marginTop: 5 }}
              >
                {/*Date Format */}
                <View>
                  {(filetype === 'qif' || filetype === 'csv') && (
                    <DateFormatSelect
                      transactions={transactions}
                      fieldMappings={fieldMappings}
                      parseDateFormat={parseDateFormat}
                      onChange={value => {
                        setParseDateFormat(value);
                        runImportPreview();
                      }}
                    />
                  )}
                </View>

                {/* CSV Options */}
                {filetype === 'csv' && (
                  <View style={{ marginLeft: 10, gap: 5 }}>
                    <SectionLabel title={t('CSV OPTIONS')} />
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 5,
                        alignItems: 'baseline',
                      }}
                    >
                      {t('Delimiter:')}
                      <Select
                        options={[
                          [',', ','],
                          [';', ';'],
                          ['|', '|'],
                          ['\t', 'tab'],
                        ]}
                        value={delimiter}
                        onChange={value => {
                          setDelimiter(value);
                          parse(
                            filename,
                            getParseOptions('csv', {
                              delimiter: value,
                              hasHeaderRow,
                              skipLines,
                            }),
                          );
                        }}
                        style={{ width: 50 }}
                      />
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 5,
                        alignItems: 'baseline',
                      }}
                    >
                      {t('Skip lines:')}
                      <Input
                        type="number"
                        value={skipLines}
                        min="0"
                        onChangeValue={value => {
                          setSkipLines(+value);
                          parse(
                            filename,
                            getParseOptions('csv', {
                              delimiter,
                              hasHeaderRow,
                              skipLines: +value,
                            }),
                          );
                        }}
                        style={{ width: 50 }}
                      />
                    </label>
                    <CheckboxOption
                      id="form_has_header"
                      checked={hasHeaderRow}
                      onChange={() => {
                        setHasHeaderRow(!hasHeaderRow);
                        parse(
                          filename,
                          getParseOptions('csv', {
                            delimiter,
                            hasHeaderRow: !hasHeaderRow,
                            skipLines,
                          }),
                        );
                      }}
                    >
                      {t('File has header row')}
                    </CheckboxOption>
                    <CheckboxOption
                      id="clear_on_import"
                      checked={clearOnImport}
                      onChange={() => {
                        setClearOnImport(!clearOnImport);
                      }}
                    >
                      {t('Clear transactions on import')}
                    </CheckboxOption>
                    <CheckboxOption
                      id="form_dont_reconcile"
                      checked={reconcile}
                      onChange={() => {
                        setReconcile(!reconcile);
                      }}
                    >
                      {t('Merge with existing transactions')}
                    </CheckboxOption>
                  </View>
                )}

                <View style={{ flex: 1 }} />

                <View style={{ marginRight: 10, gap: 5 }}>
                  <SectionLabel title={t('AMOUNT OPTIONS')} />
                  <CheckboxOption
                    id="form_flip"
                    checked={flipAmount}
                    disabled={splitMode || inOutMode}
                    onChange={() => {
                      setFlipAmount(!flipAmount);
                      runImportPreview();
                    }}
                  >
                    {t('Flip amount')}
                  </CheckboxOption>
                  {filetype === 'csv' && (
                    <>
                      <CheckboxOption
                        id="form_split"
                        checked={splitMode}
                        disabled={inOutMode || flipAmount}
                        onChange={() => {
                          onSplitMode();
                          runImportPreview();
                        }}
                      >
                        {t('Split amount into separate inflow/outflow columns')}
                      </CheckboxOption>
                      <InOutOption
                        inOutMode={inOutMode}
                        outValue={outValue}
                        disabled={splitMode || flipAmount}
                        onToggle={() => {
                          setInOutMode(!inOutMode);
                          runImportPreview();
                        }}
                        onChangeText={setOutValue}
                      />
                    </>
                  )}
                  <MultiplierOption
                    multiplierEnabled={multiplierEnabled}
                    multiplierAmount={multiplierAmount}
                    onToggle={() => {
                      setMultiplierEnabled(!multiplierEnabled);
                      setMultiplierAmount('');
                      runImportPreview();
                    }}
                    onChangeAmount={onMultiplierChange}
                  />
                </View>
              </Stack>
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
              <ButtonWithLoading
                variant="primary"
                autoFocus
                isDisabled={
                  transactions?.filter(
                    trans => !trans.isMatchedTransaction && trans.selected,
                  ).length === 0
                }
                isLoading={loadingState === 'importing'}
                onPress={() => {
                  onImport(close);
                }}
              >
                Import{' '}
                {
                  transactions?.filter(
                    trans => !trans.isMatchedTransaction && trans.selected,
                  ).length
                }{' '}
                {t('transactions')}
              </ButtonWithLoading>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}

function getParseOptions(fileType, options = {}) {
  if (fileType === 'csv') {
    const { delimiter, hasHeaderRow, skipLines } = options;
    return { delimiter, hasHeaderRow, skipLines };
  } else if (isOfxFile(fileType)) {
    const { fallbackMissingPayeeToMemo } = options;
    return { fallbackMissingPayeeToMemo };
  }
  return {};
}

function isOfxFile(fileType) {
  return fileType === 'ofx' || fileType === 'qfx';
}

function isCamtFile(fileType) {
  return fileType === 'xml';
}
