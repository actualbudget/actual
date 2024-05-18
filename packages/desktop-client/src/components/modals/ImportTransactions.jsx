import React, { useState, useEffect, useMemo } from 'react';

import * as d from 'date-fns';

import { format as formatDate_ } from 'loot-core/src/shared/months';
import {
  amountToCurrency,
  amountToInteger,
  looselyParseAmount,
} from 'loot-core/src/shared/util';

import { useActions } from '../../hooks/useActions';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useLocalPrefs } from '../../hooks/useLocalPrefs';
import { theme, styles } from '../../style';
import { Button, ButtonWithLoading } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox, SectionLabel } from '../forms';
import { TableHeader, TableWithNavigator, Row, Field } from '../table';

const dateFormats = [
  { format: 'yyyy mm dd', label: 'YYYY MM DD' },
  { format: 'yy mm dd', label: 'YY MM DD' },
  { format: 'mm dd yyyy', label: 'MM DD YYYY' },
  { format: 'mm dd yy', label: 'MM DD YY' },
  { format: 'dd mm yyyy', label: 'DD MM YYYY' },
  { format: 'dd mm yy', label: 'DD MM YY' },
];

export function parseDate(str, order) {
  if (typeof str !== 'string') {
    return null;
  }

  function pad(v) {
    return v && v.length === 1 ? '0' + v : v;
  }

  const dateGroups = (a, b) => str => {
    const parts = str
      .replace(/\bjan(\.|uary)?\b/i, '01')
      .replace(/\bfeb(\.|ruary)?\b/i, '02')
      .replace(/\bmar(\.|ch)?\b/i, '03')
      .replace(/\bapr(\.|il)?\b/i, '04')
      .replace(/\bmay\.?\b/i, '05')
      .replace(/\bjun(\.|e)?\b/i, '06')
      .replace(/\bjul(\.|y)?\b/i, '07')
      .replace(/\baug(\.|ust)?\b/i, '08')
      .replace(/\bsep(\.|tember)?\b/i, '09')
      .replace(/\boct(\.|ober)?\b/i, '10')
      .replace(/\bnov(\.|ember)?\b/i, '11')
      .replace(/\bdec(\.|ember)?\b/i, '12')
      .replace(/^[^\d]+/, '')
      .replace(/[^\d]+$/, '')
      .split(/[^\d]+/);
    if (parts.length >= 3) {
      return parts.slice(0, 3);
    }

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

  const parsed = `${year}-${pad(month)}-${pad(day)}`;
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
  const m = filepath.match(/\.([^.]*)$/);
  if (!m) return 'ofx';
  const rawType = m[1].toLowerCase();
  if (rawType === 'tsv') return 'csv';
  return rawType;
}

function ParsedDate({ parseDateFormat, dateFormat, date }) {
  const parsed =
    date &&
    formatDate(
      parseDateFormat ? parseDate(date, parseDateFormat) : date,
      dateFormat,
    );
  return (
    <Text>
      <Text>
        {date || (
          <Text style={{ color: theme.pageTextLight, fontStyle: 'italic' }}>
            Empty
          </Text>
        )}{' '}
        &rarr;{' '}
      </Text>
      <Text style={{ color: parsed ? theme.noticeTextLight : theme.errorText }}>
        {parsed || 'Invalid'}
      </Text>
    </Text>
  );
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

  const transaction = transactions[0];
  const fields = Object.entries(transaction);

  function key(entry) {
    return entry ? entry[0] : null;
  }

  const dateField = key(
    fields.find(([name]) => name.toLowerCase().includes('date')) ||
      fields.find(([, value]) => value.match(/^\d+[-/]\d+[-/]\d+$/)),
  );

  const amountField = key(
    fields.find(([name]) => name.toLowerCase().includes('amount')) ||
      fields.find(([, value]) => value.match(/^-?[.,\d]+$/)),
  );

  const categoryField = key(
    fields.find(([name]) => name.toLowerCase().includes('category')),
  );

  const payeeField = key(
    fields.find(
      ([name]) =>
        name !== dateField && name !== amountField && name !== categoryField,
    ),
  );

  const notesField = key(
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

function applyFieldMappings(transaction, mappings) {
  const result = {};
  for (const [originalField, target] of Object.entries(mappings)) {
    let field = originalField;
    if (field === 'payee') {
      field = 'payee_name';
    }

    result[field] = transaction[target || field];
  }
  return result;
}

function parseAmount(amount, mapper, multiplier) {
  if (amount == null) {
    return null;
  }

  const parsed =
    typeof amount === 'string' ? looselyParseAmount(amount) : amount;

  if (parsed === null) {
    return null;
  }

  return mapper(parsed) * multiplier;
}

function parseAmountFields(
  trans,
  splitMode,
  inOutMode,
  outValue,
  flipAmount,
  multiplierAmount,
) {
  const multiplier = parseFloat(multiplierAmount) || 1.0;

  if (splitMode) {
    // Split mode is a little weird; first we look for an outflow and
    // if that has a value, we never want to show a number in the
    // inflow. Same for `amount`; we choose outflow first and then inflow
    const outflow = parseAmount(trans.outflow, n => -Math.abs(n), multiplier);
    const inflow = outflow
      ? 0
      : parseAmount(trans.inflow, n => Math.abs(n), multiplier);

    return {
      amount: outflow || inflow,
      outflow,
      inflow,
    };
  }
  if (inOutMode) {
    return {
      amount: parseAmount(
        trans.amount,
        n => (trans.inOut === outValue ? Math.abs(n) * -1 : Math.abs(n)),
        multiplier,
      ),
      outflow: null,
      inflow: null,
    };
  }
  return {
    amount: parseAmount(
      trans.amount,
      n => (flipAmount ? n * -1 : n),
      multiplier,
    ),
    outflow: null,
    inflow: null,
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

function Transaction({
  transaction: rawTransaction,
  fieldMappings,
  showParsed,
  parseDateFormat,
  dateFormat,
  splitMode,
  inOutMode,
  outValue,
  flipAmount,
  multiplierAmount,
  categories,
}) {
  const categoryList = categories.map(category => category.name);
  const transaction = useMemo(
    () =>
      fieldMappings
        ? applyFieldMappings(rawTransaction, fieldMappings)
        : rawTransaction,
    [rawTransaction, fieldMappings],
  );

  const { amount, outflow, inflow } = parseAmountFields(
    transaction,
    splitMode,
    inOutMode,
    outValue,
    flipAmount,
    multiplierAmount,
  );

  return (
    <Row
      style={{
        backgroundColor: theme.tableBackground,
      }}
    >
      <Field width={200}>
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
        title={transaction.imported_payee || transaction.payee_name}
      >
        {transaction.payee_name}
      </Field>
      <Field width="flex" title={transaction.notes}>
        {transaction.notes}
      </Field>
      <Field
        width="flex"
        title={
          categoryList.includes(transaction.category)
            ? transaction.category
            : undefined
        }
      >
        {categoryList.includes(transaction.category) && transaction.category}
      </Field>
      {splitMode ? (
        <>
          <Field
            width={90}
            contentStyle={{
              textAlign: 'right',
              ...styles.tnum,
              ...(inflow === null && outflow === null
                ? { color: theme.errorText }
                : {}),
            }}
            title={
              inflow === null && outflow === null
                ? 'Invalid: unable to parse the value'
                : amountToCurrency(outflow)
            }
          >
            {amountToCurrency(outflow)}
          </Field>
          <Field
            width={90}
            contentStyle={{
              textAlign: 'right',
              ...styles.tnum,
              ...(inflow === null && outflow === null
                ? { color: theme.errorText }
                : {}),
            }}
            title={
              inflow === null && outflow === null
                ? 'Invalid: unable to parse the value'
                : amountToCurrency(inflow)
            }
          >
            {amountToCurrency(inflow)}
          </Field>
        </>
      ) : (
        <>
          {inOutMode && (
            <Field
              width={90}
              contentStyle={{ textAlign: 'left', ...styles.tnum }}
              title={transaction.inOut}
            >
              {transaction.inOut}
            </Field>
          )}
          <Field
            width={90}
            contentStyle={{
              textAlign: 'right',
              ...styles.tnum,
              ...(amount === null ? { color: theme.errorText } : {}),
            }}
            title={
              amount === null
                ? `Invalid: unable to parse the value (${transaction.amount})`
                : amountToCurrency(amount)
            }
          >
            {amountToCurrency(amount)}
          </Field>
        </>
      )}
    </Row>
  );
}

function SubLabel({ title }) {
  return (
    <Text style={{ fontSize: 13, marginBottom: 3, color: theme.pageText }}>
      {title}
    </Text>
  );
}

function SelectField({
  style,
  options,
  value,
  onChange,
  hasHeaderRow,
  firstTransaction,
}) {
  return (
    <Select
      options={[
        ['choose-field', 'Choose field...'],
        ...options.map(option => [
          option,
          hasHeaderRow
            ? option
            : `Column ${parseInt(option) + 1} (${firstTransaction[option]})`,
        ]),
      ]}
      value={value === null ? 'choose-field' : value}
      style={{ width: '100%' }}
      wrapperStyle={style}
      onChange={value => onChange(value)}
    />
  );
}

function DateFormatSelect({
  transactions,
  fieldMappings,
  parseDateFormat,
  onChange,
}) {
  // We don't actually care about the delimiter, but we try to render
  // it based on the data we have so far. Look in a transaction and
  // try to figure out what delimiter the date is using, and default
  // to space if we can't figure it out.
  let delimiter = '-';
  if (transactions.length > 0 && fieldMappings && fieldMappings.date != null) {
    const date = transactions[0][fieldMappings.date];
    const m = date && date.match(/[/.,-/\\]/);
    delimiter = m ? m[0] : ' ';
  }

  return (
    <View style={{ width: 120 }}>
      <SectionLabel title="Date format" />
      <Select
        options={dateFormats.map(f => [
          f.format,
          f.label.replace(/ /g, delimiter),
        ])}
        value={parseDateFormat || ''}
        onChange={value => onChange(value)}
        style={{ width: '100%' }}
      />
    </View>
  );
}

function CheckboxOption({ id, checked, disabled, onChange, children, style }) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        minHeight: 28,
        ...style,
      }}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <label
        htmlFor={id}
        style={{
          userSelect: 'none',
          color: disabled ? theme.pageTextSubdued : null,
        }}
      >
        {children}
      </label>
    </View>
  );
}

function MultiplierOption({
  multiplierEnabled,
  multiplierAmount,
  onToggle,
  onChangeAmount,
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, height: 28 }}>
      <CheckboxOption
        id="add_multiplier"
        checked={multiplierEnabled}
        onChange={onToggle}
      >
        Add multiplier
      </CheckboxOption>
      <Input
        type="text"
        style={{ display: multiplierEnabled ? 'inherit' : 'none' }}
        value={multiplierAmount}
        placeholder="Multiplier"
        onChangeValue={onChangeAmount}
      />
    </View>
  );
}

function InOutOption({
  inOutMode,
  outValue,
  disabled,
  onToggle,
  onChangeText,
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, height: 28 }}>
      <CheckboxOption
        id="form_inOut"
        checked={inOutMode}
        disabled={disabled}
        onChange={onToggle}
      >
        {inOutMode
          ? 'in/out identifier'
          : 'Select column to specify if amount goes in/out'}
      </CheckboxOption>
      {inOutMode && (
        <Input
          type="text"
          value={outValue}
          onChangeValue={onChangeText}
          placeholder="Value for out rows, i.e. Credit"
        />
      )}
    </View>
  );
}

function FieldMappings({
  transactions,
  mappings,
  onChange,
  splitMode,
  inOutMode,
  hasHeaderRow,
}) {
  if (transactions.length === 0) {
    return null;
  }

  const options = Object.keys(transactions[0]);
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
        <View style={{ flex: 1 }}>
          <SubLabel title="Date" />
          <SelectField
            options={options}
            value={mappings.date}
            style={{ marginRight: 5 }}
            onChange={name => onChange('date', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SubLabel title="Payee" />
          <SelectField
            options={options}
            value={mappings.payee}
            style={{ marginRight: 5 }}
            onChange={name => onChange('payee', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SubLabel title="Notes" />
          <SelectField
            options={options}
            value={mappings.notes}
            style={{ marginRight: 5 }}
            onChange={name => onChange('notes', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SubLabel title="Category" />
          <SelectField
            options={options}
            value={mappings.category}
            style={{ marginRight: 5 }}
            onChange={name => onChange('category', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        {splitMode ? (
          <>
            <View style={{ flex: 0.5 }}>
              <SubLabel title="Outflow" />
              <SelectField
                options={options}
                value={mappings.outflow}
                onChange={name => onChange('outflow', name)}
                hasHeaderRow={hasHeaderRow}
                firstTransaction={transactions[0]}
              />
            </View>
            <View style={{ flex: 0.5 }}>
              <SubLabel title="Inflow" />
              <SelectField
                options={options}
                value={mappings.inflow}
                onChange={name => onChange('inflow', name)}
                hasHeaderRow={hasHeaderRow}
                firstTransaction={transactions[0]}
              />
            </View>
          </>
        ) : (
          <>
            {inOutMode && (
              <View style={{ flex: 1 }}>
                <SubLabel title="In/Out" />
                <SelectField
                  options={options}
                  value={mappings.inOut}
                  onChange={name => onChange('inOut', name)}
                  hasHeaderRow={hasHeaderRow}
                  firstTransaction={transactions[0]}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <SubLabel title="Amount" />
              <SelectField
                options={options}
                value={mappings.amount}
                onChange={name => onChange('amount', name)}
                hasHeaderRow={hasHeaderRow}
                firstTransaction={transactions[0]}
              />
            </View>
          </>
        )}
      </Stack>
    </View>
  );
}

export function ImportTransactions({ modalProps, options }) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const prefs = useLocalPrefs();
  const { parseTransactions, importTransactions, getPayees, savePrefs } =
    useActions();

  const [multiplierAmount, setMultiplierAmount] = useState('');
  const [loadingState, setLoadingState] = useState('parsing');
  const [error, setError] = useState(null);
  const [filename, setFilename] = useState(options.filename);
  const [transactions, setTransactions] = useState([]);
  const [filetype, setFileType] = useState(null);
  const [fieldMappings, setFieldMappings] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [inOutMode, setInOutMode] = useState(false);
  const [outValue, setOutValue] = useState('');
  const [flipAmount, setFlipAmount] = useState(false);
  const [multiplierEnabled, setMultiplierEnabled] = useState(false);
  const [reconcile, setReconcile] = useState(true);
  const { accountId, categories, onImported } = options;

  // This cannot be set after parsing the file, because changing it
  // requires re-parsing the file. This is different from the other
  // options which are simple post-processing. That means if you
  // parsed different files without closing the modal, it wouldn't
  // re-read this.
  const [delimiter, setDelimiter] = useState(
    prefs[`csv-delimiter-${accountId}`] ||
      (filename.endsWith('.tsv') ? '\t' : ','),
  );
  const [hasHeaderRow, setHasHeaderRow] = useState(
    prefs[`csv-has-header-${accountId}`] ?? true,
  );
  const [fallbackMissingPayeeToMemo, setFallbackMissingPayeeToMemo] = useState(
    prefs[`ofx-fallback-missing-payee-${accountId}`] ?? true,
  );

  const [parseDateFormat, setParseDateFormat] = useState(null);

  const [clearOnImport, setClearOnImport] = useState(true);

  async function parse(filename, options) {
    setLoadingState('parsing');

    const filetype = getFileType(filename);
    setFilename(filename);
    setFileType(filetype);

    const { errors, transactions } = await parseTransactions(filename, options);
    setLoadingState(null);
    setError(null);

    /// Do fine grained reporting between the old and new OFX importers.
    if (errors.length > 0) {
      setError({
        parsed: true,
        message: errors[0].message || 'Internal error',
      });
    } else {
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
        const initialSplitMode = !!(mappings.outflow || mappings.inflow);
        setSplitMode(initialSplitMode);

        setParseDateFormat(
          prefs[`parse-date-${accountId}-${filetype}`] ||
            getInitialDateFormat(transactions, mappings),
        );
      } else if (filetype === 'qif') {
        setParseDateFormat(
          prefs[`parse-date-${accountId}-${filetype}`] ||
            getInitialDateFormat(transactions, { date: 'date' }),
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

  function onMultiplierChange(e) {
    const amt = e;
    if (!amt || amt.match(/^\d{1,}(\.\d{0,4})?$/)) {
      setMultiplierAmount(amt);
    }
  }

  useEffect(() => {
    const fileType = getFileType(options.filename);
    const parseOptions = getParseOptions(fileType, {
      delimiter,
      hasHeaderRow,
      fallbackMissingPayeeToMemo,
    });

    parse(options.filename, parseOptions);
  }, [parseTransactions, options.filename]);

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
    const res = await window.Actual?.openFileDialog({
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
      fallbackMissingPayeeToMemo,
    });

    parse(res[0], parseOptions);
  }

  function onUpdateFields(field, name) {
    setFieldMappings({ ...fieldMappings, [field]: name === '' ? null : name });
  }

  async function onImport() {
    setLoadingState('importing');

    const finalTransactions = [];
    let errorMessage;

    for (let trans of transactions) {
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
      if (category_id != null) {
        trans.category = category_id;
      }

      const { inflow, outflow, inOut, ...finalTransaction } = trans;
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
        [`ofx-fallback-missing-payee-${accountId}`]: fallbackMissingPayeeToMemo,
      });
    }

    if (filetype === 'csv') {
      savePrefs({
        [`csv-mappings-${accountId}`]: JSON.stringify(fieldMappings),
      });
      savePrefs({ [`csv-delimiter-${accountId}`]: delimiter });
    }

    if (filetype === 'csv' || filetype === 'qif') {
      savePrefs({ [`flip-amount-${accountId}-${filetype}`]: flipAmount });
    }

    const didChange = await importTransactions(
      accountId,
      finalTransactions,
      reconcile,
    );
    if (didChange) {
      await getPayees();
    }

    if (onImported) {
      onImported(didChange);
    }

    modalProps.onClose();
  }

  const headers = [
    { name: 'Date', width: 200 },
    { name: 'Payee', width: 'flex' },
    { name: 'Notes', width: 'flex' },
    { name: 'Category', width: 'flex' },
  ];

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
      title={
        'Import transactions' + (filetype ? ` (${filetype.toUpperCase()})` : '')
      }
      {...modalProps}
      loading={loadingState === 'parsing'}
      style={{ width: 800 }}
    >
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
            items={transactions}
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
                  No transactions found
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
          Use Memo as a fallback for empty Payees
        </CheckboxOption>
      )}
      {(isOfxFile(filetype) || isCamtFile(filetype)) && (
        <CheckboxOption
          id="form_dont_reconcile"
          checked={reconcile}
          onChange={() => {
            setReconcile(state => !state);
          }}
        >
          Reconcile transactions
        </CheckboxOption>
      )}

      {/*Import Options */}
      {(filetype === 'qif' || filetype === 'csv') && (
        <View style={{ marginTop: 25 }}>
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
                  onChange={setParseDateFormat}
                />
              )}
            </View>

            {/* CSV Options */}
            {filetype === 'csv' && (
              <View style={{ marginLeft: 25, gap: 5 }}>
                <SectionLabel title="CSV OPTIONS" />
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 5,
                    alignItems: 'baseline',
                  }}
                >
                  Delimiter:
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
                      }),
                    );
                  }}
                >
                  File has header row
                </CheckboxOption>
                <CheckboxOption
                  id="clear_on_import"
                  checked={clearOnImport}
                  onChange={() => {
                    setClearOnImport(!clearOnImport);
                  }}
                >
                  Clear transactions on import
                </CheckboxOption>
                <CheckboxOption
                  id="form_dont_reconcile"
                  checked={reconcile}
                  onChange={() => {
                    setReconcile(state => !state);
                  }}
                >
                  Reconcile transactions
                </CheckboxOption>
              </View>
            )}

            <View style={{ flex: 1 }} />

            <View style={{ marginRight: 25, gap: 5 }}>
              <SectionLabel title="AMOUNT OPTIONS" />
              <CheckboxOption
                id="form_flip"
                checked={flipAmount}
                disabled={splitMode || inOutMode}
                onChange={() => setFlipAmount(!flipAmount)}
              >
                Flip amount
              </CheckboxOption>
              {filetype === 'csv' && (
                <>
                  <CheckboxOption
                    id="form_split"
                    checked={splitMode}
                    disabled={inOutMode || flipAmount}
                    onChange={onSplitMode}
                  >
                    Split amount into separate inflow/outflow columns
                  </CheckboxOption>
                  <InOutOption
                    inOutMode={inOutMode}
                    outValue={outValue}
                    disabled={splitMode || flipAmount}
                    onToggle={() => setInOutMode(!inOutMode)}
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
          }}
        >
          <ButtonWithLoading
            type="primary"
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

function getParseOptions(fileType, options = {}) {
  if (fileType === 'csv') {
    const { delimiter, hasHeaderRow } = options;
    return { delimiter, hasHeaderRow };
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
