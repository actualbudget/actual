import React, { useState, useEffect, useMemo, useCallback } from 'react';

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
import { SvgDownAndRightArrow } from '../../icons/v2';
import { theme, styles } from '../../style';
import { Button, ButtonWithLoading } from '../common/Button2';
import { Input } from '../common/Input';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { Tooltip } from '../common/Tooltip';
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

function applyFieldMappings(transaction, mappings) {
  const result = {};
  for (const [originalField, target] of Object.entries(mappings)) {
    let field = originalField;
    if (field === 'payee') {
      field = 'payee_name';
    }

    result[field] = transaction[target || field];
  }
  // Keep preview fields on the mapped transactions
  result.trx_id = transaction.trx_id;
  result.existing = transaction.existing;
  result.ignored = transaction.ignored;
  result.selected = transaction.selected;
  result.selected_merge = transaction.selected_merge;
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
  onCheckTransaction,
  reconcile,
}) {
  const categoryList = categories.map(category => category.name);
  const transaction = useMemo(
    () =>
      fieldMappings && !rawTransaction.isMatchedTransaction
        ? applyFieldMappings(rawTransaction, fieldMappings)
        : rawTransaction,
    [rawTransaction, fieldMappings],
  );

  let amount, outflow, inflow;
  if (rawTransaction.isMatchedTransaction) {
    amount = rawTransaction.amount;
    if (splitMode) {
      outflow = amount < 0 ? -amount : 0;
      inflow = amount > 0 ? amount : 0;
    }
  } else {
    ({ amount, outflow, inflow } = parseAmountFields(
      transaction,
      splitMode,
      inOutMode,
      outValue,
      flipAmount,
      multiplierAmount,
    ));
  }

  return (
    <Row
      style={{
        backgroundColor: theme.tableBackground,
        color:
          (transaction.isMatchedTransaction && !transaction.selected_merge) ||
          !transaction.selected
            ? theme.tableTextInactive
            : theme.tableText,
      }}
    >
      {reconcile && (
        <Field width={31}>
          {!transaction.isMatchedTransaction && (
            <Tooltip
              content={
                !transaction.existing && !transaction.ignored
                  ? 'New transaction. You can import it, or skip it.'
                  : transaction.ignored
                    ? 'Already imported transaction. You can skip it, or import it again.'
                    : transaction.existing
                      ? 'Updated transaction. You can update it, import it again, or skip it.'
                      : ''
              }
              placement="right top"
            >
              <Checkbox
                checked={transaction.selected}
                onChange={() => onCheckTransaction(transaction.trx_id)}
                style={
                  transaction.selected_merge
                    ? {
                        ':checked': {
                          '::after': {
                            background:
                              theme.checkboxBackgroundSelected +
                              // update sign from packages/desktop-client/src/icons/v1/layer.svg
                              // eslint-disable-next-line rulesdir/typography
                              ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="white" d="M10 1l10 6-10 6L0 7l10-6zm6.67 10L20 13l-10 6-10-6 3.33-2L10 15l6.67-4z" /></svg>\') 9px 9px',
                          },
                        },
                      }
                    : {
                        '&': {
                          border:
                            '1px solid ' + theme.buttonNormalDisabledBorder,
                          backgroundColor: theme.buttonNormalDisabledBorder,
                          '::after': {
                            display: 'block',
                            background:
                              theme.buttonNormalDisabledBorder +
                              // minus sign adapted from packages/desktop-client/src/icons/v1/add.svg
                              // eslint-disable-next-line rulesdir/typography
                              ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" className="path" d="M23,11.5 L23,11.5 L23,11.5 C23,12.3284271 22.3284271,13 21.5,13 L1.5,13 L1.5,13 C0.671572875,13 1.01453063e-16,12.3284271 0,11.5 L0,11.5 L0,11.5 C-1.01453063e-16,10.6715729 0.671572875,10 1.5,10 L21.5,10 L21.5,10 C22.3284271,10 23,10.6715729 23,11.5 Z" /></svg>\') 9px 9px',
                            width: 9,
                            height: 9,
                            content: ' ',
                          },
                        },
                        ':checked': {
                          border: '1px solid ' + theme.checkboxBorderSelected,
                          backgroundColor: theme.checkboxBackgroundSelected,
                          '::after': {
                            background:
                              theme.checkboxBackgroundSelected +
                              // plus sign from packages/desktop-client/src/icons/v1/add.svg
                              // eslint-disable-next-line rulesdir/typography
                              ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" className="path" d="M23,11.5 L23,11.5 L23,11.5 C23,12.3284271 22.3284271,13 21.5,13 L1.5,13 L1.5,13 C0.671572875,13 1.01453063e-16,12.3284271 0,11.5 L0,11.5 L0,11.5 C-1.01453063e-16,10.6715729 0.671572875,10 1.5,10 L21.5,10 L21.5,10 C22.3284271,10 23,10.6715729 23,11.5 Z" /><path fill="white" className="path" d="M11.5,23 C10.6715729,23 10,22.3284271 10,21.5 L10,1.5 C10,0.671572875 10.6715729,1.52179594e-16 11.5,0 C12.3284271,-1.52179594e-16 13,0.671572875 13,1.5 L13,21.5 C13,22.3284271 12.3284271,23 11.5,23 Z" /></svg>\') 9px 9px',
                          },
                        },
                      }
                }
              />
            </Tooltip>
          )}
        </Field>
      )}
      <Field width={200}>
        {transaction.isMatchedTransaction ? (
          <View>
            <Stack direction="row" align="flex-start">
              <View>
                <SvgDownAndRightArrow width={16} height={16} />
              </View>
              <View>{formatDate(transaction.date, dateFormat)}</View>
            </Stack>
          </View>
        ) : showParsed ? (
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
      onChange={onChange}
      buttonStyle={style}
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
        onChange={onChange}
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

  const { existing, ignored, selected, selected_merge, trx_id, ...trans } =
    transactions[0];
  const options = Object.keys(trans);
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

export function ImportTransactions({ options }) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const prefs = useLocalPrefs();
  const {
    parseTransactions,
    importTransactions,
    importPreviewTransactions,
    getPayees,
    savePrefs,
  } = useActions();

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
  const [previewTrigger, setPreviewTrigger] = useState(0);
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

    const { errors, transactions: parsedTransactions } =
      await parseTransactions(filename, options);

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
        flipAmount = prefs[`flip-amount-${accountId}-${filetype}`] || false;
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
  }

  function onMultiplierChange(e) {
    const amt = e;
    if (!amt || amt.match(/^\d{1,}(\.\d{0,4})?$/)) {
      setMultiplierAmount(amt);
      runImportPreview();
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
    close();
  }

  const runImportPreviewCallback = useCallback(async () => {
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
    setTransactions(transactionPreview);
  }, [
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

  useEffect(() => {
    runImportPreviewCallback();
  }, [previewTrigger]);

  function runImportPreview() {
    setPreviewTrigger(value => value + 1);
  }

  async function getImportPreview(
    transactions,
    filetype,
    flipAmount,
    fieldMappings,
    splitMode,
    parseDateFormat,
    inOutMode,
    outValue,
    multiplierAmount,
  ) {
    const previewTransactions = [];

    for (let trans of transactions) {
      if (trans.isMatchedTransaction) {
        // skip transactions that are matched transaction (existing transaction added to show update changes)
        continue;
      }

      trans = fieldMappings ? applyFieldMappings(trans, fieldMappings) : trans;

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
    const previewTrx = await importPreviewTransactions(
      accountId,
      previewTransactions,
    );
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
  }

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
              'Import transactions' +
              (filetype ? ` (${filetype.toUpperCase()})` : '')
            }
            rightContent={<ModalCloseButton onClick={close} />}
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
                <Button onPress={() => onNewFile()}>Select new file...</Button>
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
              Use Memo as a fallback for empty Payees
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
              Merge with existing transactions
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
                        setReconcile(!reconcile);
                      }}
                    >
                      Merge with existing transactions
                    </CheckboxOption>
                  </View>
                )}

                <View style={{ flex: 1 }} />

                <View style={{ marginRight: 10, gap: 5 }}>
                  <SectionLabel title="AMOUNT OPTIONS" />
                  <CheckboxOption
                    id="form_flip"
                    checked={flipAmount}
                    disabled={splitMode || inOutMode}
                    onChange={() => {
                      setFlipAmount(!flipAmount);
                      runImportPreview();
                    }}
                  >
                    Flip amount
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
                        Split amount into separate inflow/outflow columns
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
                isDisabled={
                  transactions?.filter(trans => !trans.isMatchedTransaction)
                    .length === 0
                }
                isLoading={loadingState === 'importing'}
                onPress={() => {
                  onImport(close);
                }}
              >
                Import{' '}
                {
                  transactions?.filter(trans => !trans.isMatchedTransaction)
                    .length
                }{' '}
                transactions
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
