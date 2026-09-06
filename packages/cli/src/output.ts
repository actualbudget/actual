import Table from 'cli-table3';

export type OutputFormat = 'json' | 'table' | 'csv';

export const OUTPUT_FORMATS: readonly OutputFormat[] = ['json', 'table', 'csv'];

export function isOutputFormat(value: unknown): value is OutputFormat {
  return (
    typeof value === 'string' && (OUTPUT_FORMATS as string[]).includes(value)
  );
}

// Fields containing integer-cent values, auto-formatted as decimals in table/csv output.
const AMOUNT_FIELDS = new Set([
  'amount',
  'balance',
  'balance_available',
  'balance_current',
  'balance_limit',
  'budgeted',
  'spent',
  'carryover',
  'received',
  'income',
  'expenses',
  'net',
  'total',
  'inflow',
  'outflow',
  'onBudget',
  'offBudget',
  'netWorth',
  'average',
  'change',
]);

// Camel-cased summary fields returned by budget month data and reports.
const AMOUNT_KEY_PATTERN =
  /(amount|balance|budgeted|spent|received|income|available|overspent|toBudget|forNextMonth|fromLastMonth|leftover)$/i;

export function isAmountKey(key: string): boolean {
  return AMOUNT_FIELDS.has(key) || AMOUNT_KEY_PATTERN.test(key);
}

function isAmountValue(key: string, value: unknown): value is number {
  return isAmountKey(key) && typeof value === 'number';
}

/** Format integer cents as a plain decimal string, e.g. 143353 -> "1433.53". */
export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Format integer cents with thousands separators, e.g. 143353 -> "1,433.53". */
export function formatMoney(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}.${frac}`;
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatCellValue(
  key: string,
  value: unknown,
  moneyStyle: 'plain' | 'grouped',
): string {
  if (isAmountValue(key, value)) {
    return moneyStyle === 'grouped'
      ? formatMoney(value)
      : centsToDecimal(value);
  }
  return formatScalar(value);
}

function collectKeys(rows: unknown[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    for (const key of Object.keys(row as Record<string, unknown>)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  return keys;
}

export function formatOutput(
  data: unknown,
  format: OutputFormat = 'json',
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'table':
      return formatTable(data);
    case 'csv':
      return formatCsv(data);
    default:
      return JSON.stringify(data, null, 2);
  }
}

function formatTable(data: unknown): string {
  if (!Array.isArray(data)) {
    if (data && typeof data === 'object') {
      const table = new Table();
      for (const [key, value] of Object.entries(data)) {
        table.push({ [key]: formatCellValue(key, value, 'grouped') });
      }
      return table.toString();
    }
    return String(data);
  }

  if (data.length === 0) {
    return '(no results)';
  }

  if (data.every(row => !row || typeof row !== 'object')) {
    return data.map(v => formatScalar(v)).join('\n');
  }

  const keys = collectKeys(data);
  const table = new Table({
    head: keys,
    colAligns: keys.map(k => (isAmountKey(k) ? 'right' : 'left')),
  });

  for (const row of data) {
    const r = row as Record<string, unknown>;
    table.push(keys.map(k => formatCellValue(k, r[k], 'grouped')));
  }

  return table.toString();
}

function formatCsv(data: unknown): string {
  if (!Array.isArray(data)) {
    if (data && typeof data === 'object') {
      const entries = Object.entries(data);
      const header = entries.map(([k]) => escapeCsv(k)).join(',');
      const values = entries.map(([k, v]) => formatCsvCell(k, v)).join(',');
      return header + '\n' + values;
    }
    return String(data);
  }

  if (data.length === 0) {
    return '';
  }

  const keys = collectKeys(data);
  const header = keys.map(k => escapeCsv(k)).join(',');
  const rows = data.map(row => {
    const r = row as Record<string, unknown>;
    return keys.map(k => formatCsvCell(k, r[k])).join(',');
  });

  return [header, ...rows].join('\n');
}

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

function formatCsvCell(key: string, value: unknown): string {
  let formatted = formatCellValue(key, value, 'plain');
  // Skip neutralization for numeric values so legitimate negative amounts
  // like "-25.00" aren't quoted as text.
  if (typeof value !== 'number' && FORMULA_TRIGGERS.test(formatted)) {
    formatted = "'" + formatted;
  }
  return escapeCsv(formatted);
}

function escapeCsv(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function printOutput(data: unknown, format: OutputFormat = 'json') {
  process.stdout.write(formatOutput(data, format) + '\n');
}
