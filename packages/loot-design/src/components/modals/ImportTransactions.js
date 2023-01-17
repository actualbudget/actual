import React, { useState, useEffect, useMemo } from 'react';
import { connect } from 'react-redux';

import * as d from 'date-fns';

import * as actions from 'loot-core/src/client/actions';
import { format as formatDate_ } from 'loot-core/src/shared/months';
import {
  amountToCurrency,
  amountToInteger,
  looselyParseAmount
} from 'loot-core/src/shared/util';

import { colors, styles } from '../../style';
import {
  View,
  Text,
  Stack,
  Modal,
  Select,
  Button,
  ButtonWithLoading
} from '../common';
import { Checkbox, SectionLabel } from '../forms';
import { TableHeader, TableWithNavigator, Row, Field } from '../table';

let dateFormats = [
  { format: 'yyyy mm dd', label: 'YYYY MM DD' },
  { format: 'yy mm dd', label: 'YY MM DD' },
  { format: 'mm dd yyyy', label: 'MM DD YYYY' },
  { format: 'mm dd yy', label: 'MM DD YY' },
  { format: 'dd mm yyyy', label: 'DD MM YYYY' },
  { format: 'dd mm yy', label: 'DD MM YY' }
];

export function parseDate(str, order) {
  if (typeof str !== 'string') {
    return null;
  }

  function pad(v) {
    return v && v.length === 1 ? '0' + v : v;
  }

  const dateGroups = (a, b) => str => {
    const digits = str.replace(/[^\d]/g, '');
    return [digits.slice(0, a), digits.slice(a, a + b), digits.slice(a + b)];
  };
  const yearFirst = dateGroups(4, 2);
  const twoDig = dateGroups(2, 2);

  let parts, year, month, day;
  switch (order) {
    case 'dd mm yyyy':
      parts = twoDig(str);
      year = parts[2];
      month = parts[1];
      day = parts[0];
      break;
    case 'dd mm yy':
      parts = twoDig(str);
      year = `20${parts[2]}`;
      month = parts[1];
      day = parts[0];
      break;
    case 'yyyy mm dd':
      parts = yearFirst(str);
      year = parts[0];
      month = parts[1];
      day = parts[2];
      break;
    case 'yy mm dd':
      parts = twoDig(str);
      year = `20${parts[0]}`;
      month = parts[1];
      day = parts[2];
      break;
    case 'mm dd yy':
      parts = twoDig(str);
      year = `20${parts[2]}`;
      month = parts[0];
      day = parts[1];
      break;
    default:
    case 'mm dd yyyy':
      parts = twoDig(str);
      year = parts[2];
      month = parts[0];
      day = parts[1];
  }

  let parsed = `${year}-${pad(month)}-${pad(day)}`;
  if (!d.isValid(d.parseISO(parsed))) {
    return null;
  }
  return parsed;
}

function formatDate(date, format) {
  if (!date) {
    return null;
  }
  try {
    return formatDate_(date, format);
  } catch (e) {}
  return null;
}

function getFileType(filepath) {
  let m = filepath.match(/\.([^.]*)$/);
  return m ? m[1].toLowerCase() : 'ofx';
}

function ParsedDate({ parseDateFormat, showParsed, dateFormat, date }) {
  let parsed =
    date &&
    formatDate(
      parseDateFormat ? parseDate(date, parseDateFormat) : date,
      dateFormat
    );
  return (
    <Text>
      <Text>
        {date || (
          <Text style={{ color: colors.n4, fontStyle: 'italic' }}>Empty</Text>
        )}{' '}
        &rarr;{' '}
      </Text>
      <Text style={{ color: parsed ? colors.g3 : colors.r4 }}>
        {parsed || 'Invalid'}
      </Text>
    </Text>
  );
}

function getInitialDateFormat(transactions, mappings) {
  if (transactions.length === 0 || mappings.date == null) {
    return 'yyyy mm dd';
  }

  let transaction = transactions[0];
  let date = transaction[mappings.date];

  let found =
    date == null
      ? null
      : dateFormats.find(f => parseDate(date, f.format) != null);
  return found ? found.format : 'mm dd yyyy';
}

function getInitialMappings(transactions) {
  if (transactions.length === 0) {
    return {};
  }

  let transaction = transactions[0];
  let fields = Object.entries(transaction);

  function key(entry) {
    return entry ? entry[0] : null;
  }

  let dateField = key(
    fields.find(([name, value]) => name.toLowerCase().includes('date')) ||
      fields.find(([name, value]) => value.match(/^\d+[-/]\d+[-/]\d+$/))
  );

  let amountField = key(
    fields.find(([name, value]) => name.toLowerCase().includes('amount')) ||
      fields.find(([name, value]) => value.match(/^-?[.,\d]+$/))
  );

  let payeeField = key(
    fields.find(([name, value]) => name !== dateField && name !== amountField)
  );

  let notesField = key(
    fields.find(
      ([name, value]) =>
        name !== dateField && name !== amountField && name !== payeeField
    )
  );

  return {
    date: dateField,
    amount: amountField,
    payee: payeeField,
    notes: notesField
  };
}

function applyFieldMappings(transaction, mappings) {
  let result = {};
  for (let [field, target] of Object.entries(mappings)) {
    if (field === 'payee') {
      field = 'payee_name';
    }

    result[field] = transaction[target || field];
  }
  return result;
}

function parseAmount(amount, mapper) {
  if (amount == null) {
    return null;
  }
  let parsed = typeof amount === 'string' ? looselyParseAmount(amount) : amount;
  let value = mapper(parsed);
  return value;
}

function parseAmountFields(trans, splitMode, flipAmount) {
  if (splitMode) {
    // Split mode is a little weird; first we look for an outflow and
    // if that has a value, we never want to show a number in the
    // inflow. Same for `amount`; we choose outflow first and then inflow
    let outflow = parseAmount(trans.outflow, n => -Math.abs(n));
    let inflow = outflow ? 0 : parseAmount(trans.inflow, n => Math.abs(n));

    return {
      amount: outflow || inflow,
      outflow,
      inflow
    };
  }
  return {
    amount: parseAmount(trans.amount, n => (flipAmount ? n * -1 : n)),
    outflow: null,
    inflow: null
  };
}

function Transaction({
  transaction: rawTransaction,
  fieldMappings,
  showParsed,
  parseDateFormat,
  dateFormat,
  splitMode,
  flipAmount
}) {
  let transaction = useMemo(
    () =>
      fieldMappings
        ? applyFieldMappings(rawTransaction, fieldMappings)
        : rawTransaction,
    [rawTransaction, fieldMappings]
  );

  let { amount, outflow, inflow } = parseAmountFields(
    transaction,
    splitMode,
    flipAmount
  );
  amount = amountToCurrency(amount);
  outflow = amountToCurrency(outflow);
  inflow = amountToCurrency(inflow);

  return (
    <Row style={{ backgroundColor: 'white' }}>
      <Field width={200} borderColor={colors.border}>
        {showParsed ? (
          <ParsedDate
            parseDateFormat={parseDateFormat}
            dateFormat={dateFormat}
            date={transaction.date}
          />
        ) : (
          formatDate(transaction.date, dateFormat)
        )}
      </Field>
      <Field
        width="flex"
        borderColor={colors.border}
        title={transaction.imported_payee || transaction.payee_name}
      >
        {transaction.payee_name}
      </Field>
      <Field width="flex" borderColor={colors.border} title={transaction.notes}>
        {transaction.notes}
      </Field>
      {splitMode ? (
        <>
          <Field
            width={90}
            borderColor={colors.border}
            contentStyle={[{ textAlign: 'right' }, styles.tnum]}
            title={outflow}
          >
            {outflow}
          </Field>
          <Field
            width={90}
            borderColor={colors.border}
            contentStyle={[{ textAlign: 'right' }, styles.tnum]}
            title={inflow}
          >
            {inflow}
          </Field>
        </>
      ) : (
        <Field
          width={90}
          borderColor={colors.border}
          contentStyle={[{ textAlign: 'right' }, styles.tnum]}
          title={amount}
        >
          {amount}
        </Field>
      )}
    </Row>
  );
}

function SubLabel({ title }) {
  return (
    <Text style={{ fontSize: 13, marginBottom: 3, color: colors.n3 }}>
      {title}
    </Text>
  );
}

function SelectField({ width, style, options, value, onChange }) {
  return (
    <Select
      value={value}
      style={style}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">Choose field...</option>
      {options.map(x => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </Select>
  );
}

function DateFormatSelect({
  transactions,
  fieldMappings,
  parseDateFormat,
  onChange
}) {
  // We don't actually care about the delimiter, but we try to render
  // it based on the data we have so far. Look in a transaction and
  // try to figure out what delimiter the date is using, and default
  // to space if we can't figure it out.
  let delimiter = '-';
  if (transactions.length > 0 && fieldMappings && fieldMappings.date != null) {
    let date = transactions[0][fieldMappings.date];
    let m = date && date.match(/[/.,-/\\]/);
    delimiter = m ? m[0] : ' ';
  }

  return (
    <View style={{ width: 120 }}>
      <SectionLabel title="Date format" />
      <Select
        value={parseDateFormat || ''}
        onChange={e => onChange(e.target.value)}
      >
        {dateFormats.map(f => (
          <option key={f.format} value={f.format}>
            {f.label.replace(/ /g, delimiter)}
          </option>
        ))}
      </Select>
    </View>
  );
}

function FlipAmountOption({ value, disabled, onChange }) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none'
      }}
    >
      <Checkbox
        id="form_flip"
        checked={value}
        disabled={disabled}
        onChange={onChange}
      />
      <label
        htmlFor="form_flip"
        style={{ userSelect: 'none', color: disabled ? colors.n6 : null }}
      >
        Flip amount
      </label>
    </View>
  );
}

function SplitOption({ value, onChange }) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none'
      }}
    >
      <Checkbox id="form_split" checked={value} onChange={onChange} />
      <label htmlFor="form_split" style={{ userSelect: 'none' }}>
        Split amount into separate inflow/outflow columns
      </label>
    </View>
  );
}

function FieldMappings({ transactions, mappings, onChange, splitMode }) {
  if (transactions.length === 0) {
    return null;
  }

  let options = Object.keys(transactions[0]);
  mappings = mappings || {};

  return (
    <View>
      <SectionLabel title="CSV FIELDS" />
      <Stack
        direction="row"
        align="flex-start"
        spacing={1}
        style={{ marginTop: 5 }}
      >
        <View style={{ width: 200 }}>
          <SubLabel title="Date" />
          <SelectField
            width={200}
            options={options}
            value={mappings.date || ''}
            style={{ marginRight: 5 }}
            onChange={name => onChange('date', name)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SubLabel title="Payee" />
          <SelectField
            width="flex"
            options={options}
            value={mappings.payee || ''}
            style={{ marginRight: 5 }}
            onChange={name => onChange('payee', name)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SubLabel title="Notes" />
          <SelectField
            width="flex"
            options={options}
            value={mappings.notes || ''}
            style={{ marginRight: 5 }}
            onChange={name => onChange('notes', name)}
          />
        </View>
        {splitMode ? (
          <>
            <View style={{ width: 90 }}>
              <SubLabel title="Outflow" />
              <SelectField
                width={90}
                options={options}
                value={mappings.outflow || ''}
                onChange={name => onChange('outflow', name)}
              />
            </View>
            <View style={{ width: 90 }}>
              <SubLabel title="Inflow" />
              <SelectField
                width={90}
                options={options}
                value={mappings.inflow || ''}
                onChange={name => onChange('inflow', name)}
              />
            </View>
          </>
        ) : (
          <View style={{ width: 90 }}>
            <SubLabel title="Amount" />
            <SelectField
              width={90}
              options={options}
              value={mappings.amount || ''}
              onChange={name => onChange('amount', name)}
            />
          </View>
        )}
      </Stack>
    </View>
  );
}

export function ImportTransactions({
  modalProps,
  options,
  dateFormat = 'MM/dd/yyyy',
  prefs,
  parseTransactions,
  importTransactions,
  getPayees,
  savePrefs
}) {
  let [loadingState, setLoadingState] = useState('parsing');
  let [error, setError] = useState(null);
  let [filename, setFilename] = useState(options.filename);
  let [transactions, setTransactions] = useState([]);
  let [filetype, setFileType] = useState(null);
  let [fieldMappings, setFieldMappings] = useState(null);
  let [splitMode, setSplitMode] = useState(false);
  let [flipAmount, setFlipAmount] = useState(false);
  let { accountId, onImported } = options;

  // This cannot be set after parsing the file, because changing it
  // requires re-parsing the file. This is different from the other
  // options which are simple post-processing. That means if you
  // parsed different files without closing the modal, it wouldn't
  // re-read this.
  let [csvDelimiter, setCsvDelimiter] = useState(
    prefs[`csv-delimiter-${accountId}`] || ','
  );

  let [parseDateFormat, setParseDateFormat] = useState(null);

  async function parse(filename, options) {
    setLoadingState('parsing');

    let { errors, transactions } = await parseTransactions(filename, options);

    setLoadingState(null);
    setError(null);

    if (errors.length > 0) {
      setError({
        parsed: true,
        message: errors[0].message || 'Internal error'
      });
    } else {
      let filetype = getFileType(filename);
      setFilename(filename);
      setFileType(filetype);

      if (filetype === 'csv' || filetype === 'qif') {
        setFlipAmount(prefs[`flip-amount-${accountId}-${filetype}`] || false);
      }

      if (filetype === 'csv') {
        let mappings = prefs[`csv-mappings-${accountId}`];
        mappings = mappings
          ? JSON.parse(mappings)
          : getInitialMappings(transactions);

        setFieldMappings(mappings);

        // Set initial split mode based on any saved mapping
        let initialSplitMode = !!(mappings.outflow || mappings.inflow);
        setSplitMode(initialSplitMode);

        setParseDateFormat(
          prefs[`parse-date-${accountId}-${filetype}`] ||
            getInitialDateFormat(transactions, mappings)
        );
      } else if (filetype === 'qif') {
        setParseDateFormat(
          prefs[`parse-date-${accountId}-${filetype}`] ||
            getInitialDateFormat(transactions, { date: 'date' })
        );
      } else {
        setFieldMappings(null);
        setParseDateFormat(null);
      }

      // Reverse the transactions because it's very common for them to
      // be ordered ascending, but we show transactions descending by
      // date. This is purely cosmetic.
      setTransactions(transactions.reverse());
    }
  }

  useEffect(() => {
    parse(
      options.filename,
      getFileType(options.filename) === 'csv'
        ? { delimiter: csvDelimiter }
        : null
    );
  }, [parseTransactions, options.filename]);

  function onSplitMode() {
    if (fieldMappings == null) {
      return;
    }

    let isSplit = !splitMode;
    setSplitMode(isSplit);

    // Run auto-detection on the fields to try to detect the fields
    // automatically
    let mappings = getInitialMappings(transactions);

    let newFieldMappings = isSplit
      ? {
          amount: null,
          outflow: mappings.amount,
          inflow: null
        }
      : {
          amount: mappings.amount,
          outflow: null,
          inflow: null
        };
    setFieldMappings({ ...fieldMappings, ...newFieldMappings });
  }

  function onNewFile() {
    const res = window.Actual.openFileDialog({
      filters: [
        { name: 'Financial Files', extensions: ['qif', 'ofx', 'qfx', 'csv'] }
      ]
    });

    parse(
      res[0],
      getFileType(res[0]) === 'csv' ? { delimiter: csvDelimiter } : null
    );
  }

  function onUpdateFields(field, name) {
    setFieldMappings({ ...fieldMappings, [field]: name === '' ? null : name });
  }

  async function onImport() {
    setLoadingState('importing');

    let finalTransactions = [];
    let errorMessage;

    for (let trans of transactions) {
      trans = fieldMappings ? applyFieldMappings(trans, fieldMappings) : trans;

      let date =
        filetype === 'qfx' || filetype === 'ofx'
          ? trans.date
          : parseDate(trans.date, parseDateFormat);
      if (date == null) {
        errorMessage = `Unable to parse date ${
          trans.date || '(empty)'
        } with given date format`;
        break;
      }

      let { amount } = parseAmountFields(trans, splitMode, flipAmount);
      if (amount == null) {
        errorMessage = `Transaction on ${trans.date} has no amount`;
        break;
      }

      let { inflow, outflow, ...finalTransaction } = trans;
      finalTransactions.push({
        ...finalTransaction,
        date,
        amount: amountToInteger(amount)
      });
    }

    if (errorMessage) {
      setLoadingState(null);
      setError({ parsed: false, message: errorMessage });
      return;
    }

    if (filetype !== 'ofx' && filetype !== 'qfx') {
      let key = `parse-date-${accountId}-${filetype}`;
      savePrefs({ [key]: parseDateFormat });
    }

    if (filetype === 'csv') {
      savePrefs({
        [`csv-mappings-${accountId}`]: JSON.stringify(fieldMappings)
      });
      savePrefs({ [`csv-delimiter-${accountId}`]: csvDelimiter });
    }

    if (filetype === 'csv' || filetype === 'qif') {
      savePrefs({ [`flip-amount-${accountId}-${filetype}`]: flipAmount });
    }

    let didChange = await importTransactions(accountId, finalTransactions);
    if (didChange) {
      await getPayees();
    }

    if (onImported) {
      onImported(didChange);
    }

    modalProps.onClose();
  }

  let headers = [
    { name: 'Date', width: 200 },
    { name: 'Payee', width: 'flex' },
    { name: 'Notes', width: 'flex' }
  ];

  if (splitMode) {
    headers.push({ name: 'Outflow', width: 90, style: { textAlign: 'right' } });
    headers.push({ name: 'Inflow', width: 90, style: { textAlign: 'right' } });
  } else {
    headers.push({ name: 'Amount', width: 90, style: { textAlign: 'right' } });
  }

  return (
    <Modal
      title={
        'Import transactions' + (filetype ? ` (${filetype.toUpperCase()})` : '')
      }
      {...modalProps}
      loading={loadingState === 'parsing'}
      style={{ width: 800 }}
    >
      {error && !error.parsed && (
        <View style={{ alignItems: 'center', marginBottom: 15 }}>
          <Text style={{ marginRight: 10, color: colors.r4 }}>
            <strong>Error:</strong> {error.message}
          </Text>
        </View>
      )}
      {(!error || !error.parsed) && (
        <View
          style={{
            flex: 'unset',
            height: 300,
            border: '1px solid ' + colors.border
          }}
        >
          <TableHeader headers={headers} />

          <TableWithNavigator
            items={transactions}
            fields={['payee', 'amount']}
            style={{ backgroundColor: colors.n11 }}
            getItemKey={index => index}
            renderEmpty={() => {
              return (
                <View
                  style={{
                    textAlign: 'center',
                    marginTop: 25,
                    color: colors.n4,
                    fontStyle: 'italic'
                  }}
                >
                  No transactions found
                </View>
              );
            }}
            renderItem={({ key, style, item, editing, focusedField }) => (
              <View key={key} style={style}>
                <Transaction
                  transaction={item}
                  showParsed={filetype === 'csv' || filetype === 'qif'}
                  parseDateFormat={parseDateFormat}
                  dateFormat={dateFormat}
                  fieldMappings={fieldMappings}
                  splitMode={splitMode}
                  flipAmount={flipAmount}
                />
              </View>
            )}
          />
        </View>
      )}
      {error && error.parsed && (
        <View
          style={{
            color: colors.r4,
            alignItems: 'center',
            marginTop: 10
          }}
        >
          <Text style={{ maxWidth: 450, marginBottom: 15 }}>
            <strong>Error:</strong> {error.message}
          </Text>
          {error.parsed && (
            <Button onClick={() => onNewFile()}>Select new file...</Button>
          )}
        </View>
      )}

      {filetype === 'csv' && (
        <View style={{ marginTop: 25 }}>
          <FieldMappings
            transactions={transactions}
            onChange={onUpdateFields}
            mappings={fieldMappings}
            splitMode={splitMode}
          />
        </View>
      )}

      {(filetype === 'qif' || filetype === 'csv') && (
        <View style={{ marginTop: 25 }}>
          <SectionLabel title="IMPORT OPTIONS" />
          <View style={{ marginTop: 5 }}>
            <FlipAmountOption
              value={flipAmount}
              disabled={splitMode}
              onChange={() => {
                setFlipAmount(!flipAmount);
              }}
            />
          </View>
          {filetype === 'csv' && (
            <View style={{ marginTop: 10 }}>
              <SplitOption value={splitMode} onChange={onSplitMode} />
            </View>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', marginTop: 25 }}>
        {(filetype === 'qif' || filetype === 'csv') && (
          <DateFormatSelect
            transactions={transactions}
            fieldMappings={fieldMappings}
            parseDateFormat={parseDateFormat}
            onChange={setParseDateFormat}
          />
        )}

        {filetype === 'csv' && (
          <View style={{ marginLeft: 25 }}>
            <SectionLabel title="CSV DELIMITER" />
            <Select
              value={csvDelimiter}
              onChange={e => {
                setCsvDelimiter(e.target.value);
                parse(filename, { delimiter: e.target.value });
              }}
            >
              <option value=",">,</option>
              <option value=";">;</option>
            </Select>
          </View>
        )}

        <View style={{ flex: 1 }} />

        <View
          style={{
            alignSelf: 'flex-end',
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          <ButtonWithLoading
            primary
            disabled={transactions.length === 0}
            loading={loadingState === 'importing'}
            onClick={onImport}
          >
            Import {transactions.length} transactions
          </ButtonWithLoading>
        </View>
      </View>
    </Modal>
  );
}

export default connect(
  state => ({
    dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    prefs: state.prefs.local
  }),
  actions
)(ImportTransactions);
