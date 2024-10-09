import * as d from 'date-fns';

import { format as formatDate_ } from 'loot-core/src/shared/months';
import { looselyParseAmount } from 'loot-core/src/shared/util';

export const dateFormats = [
  { format: 'yyyy mm dd', label: 'YYYY MM DD' },
  { format: 'yy mm dd', label: 'YY MM DD' },
  { format: 'mm dd yyyy', label: 'MM DD YYYY' },
  { format: 'mm dd yy', label: 'MM DD YY' },
  { format: 'dd mm yyyy', label: 'DD MM YYYY' },
  { format: 'dd mm yy', label: 'DD MM YY' },
] as const;

export function parseDate(
  str: string | number | null | Array<unknown> | object,
  order:
    | 'yyyy mm dd'
    | 'yy mm dd'
    | 'mm dd yyyy'
    | 'mm dd yy'
    | 'dd mm yyyy'
    | 'dd mm yy',
) {
  if (typeof str !== 'string') {
    return null;
  }

  function pad(v: string) {
    return v && v.length === 1 ? '0' + v : v;
  }

  const dateGroups = (a: number, b: number) => (str: string) => {
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

  let parts: string[], year: string, month: string, day: string;
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

export function formatDate(
  date: Parameters<typeof formatDate_>[0] | null,
  format: Parameters<typeof formatDate_>[1],
) {
  if (!date) {
    return null;
  }
  try {
    return formatDate_(date, format);
  } catch (e) {}
  return null;
}

export type ImportTransaction = {
  trx_id: string;
  existing: boolean;
  ignored: boolean;
  selected: boolean;
  selected_merge: boolean;
  amount: number;
  inflow: number;
  outflow: number;
  inOut: number;
} & Record<string, string>;

export type FieldMapping = {
  date: string | null;
  amount: string | null;
  payee: string | null;
  notes: string | null;
  inOut: string | null;
  category: string | null;
  outflow: string | null;
  inflow: string | null;
};

export function applyFieldMappings(
  transaction: ImportTransaction,
  mappings: FieldMapping,
) {
  const result: Partial<ImportTransaction> = {};
  for (const [originalField, target] of Object.entries(mappings)) {
    const field = originalField === 'payee' ? 'payee_name' : originalField;
    result[field] = transaction[target || field];
  }
  // Keep preview fields on the mapped transactions
  result.trx_id = transaction.trx_id;
  result.existing = transaction.existing;
  result.ignored = transaction.ignored;
  result.selected = transaction.selected;
  result.selected_merge = transaction.selected_merge;
  return result as ImportTransaction;
}

function parseAmount(
  amount: number | string | undefined | null,
  mapper: (parsed: number) => number,
  multiplier: number,
) {
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

export function parseAmountFields(
  trans: Partial<ImportTransaction>,
  splitMode: boolean,
  inOutMode: boolean,
  outValue: number,
  flipAmount: boolean,
  multiplierAmount: string,
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

export function stripCsvImportTransaction(transaction: ImportTransaction) {
  const { existing, ignored, selected, selected_merge, trx_id, ...trans } =
    transaction;

  return trans;
}
