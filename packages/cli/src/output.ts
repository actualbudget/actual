import Table from 'cli-table3';

export type OutputFormat = 'json' | 'table' | 'csv';

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
]);

function isAmountValue(key: string, value: unknown): value is number {
  return AMOUNT_FIELDS.has(key) && typeof value === 'number';
}

type FormattedCell = { value: string; isNumeric: boolean };

function formatCellValue(key: string, value: unknown): FormattedCell {
  if (isAmountValue(key, value)) {
    return { value: (value / 100).toFixed(2), isNumeric: true };
  }
  return { value: String(value ?? ''), isNumeric: typeof value === 'number' };
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
        table.push({ [key]: formatCellValue(key, value).value });
      }
      return table.toString();
    }
    return String(data);
  }

  if (data.length === 0) {
    return '(no results)';
  }

  const keys = Object.keys(data[0] as Record<string, unknown>);
  const table = new Table({ head: keys });

  for (const row of data) {
    const r = row as Record<string, unknown>;
    table.push(keys.map(k => formatCellValue(k, r[k]).value));
  }

  return table.toString();
}

function formatCsv(data: unknown): string {
  if (!Array.isArray(data)) {
    if (data && typeof data === 'object') {
      const entries = Object.entries(data);
      const header = entries.map(([k]) => escapeCsv(k)).join(',');
      const values = entries
        .map(([k, v]) => escapeCsvCell(formatCellValue(k, v)))
        .join(',');
      return header + '\n' + values;
    }
    return String(data);
  }

  if (data.length === 0) {
    return '';
  }

  const keys = Object.keys(data[0] as Record<string, unknown>);
  const header = keys.map(k => escapeCsv(k)).join(',');
  const rows = data.map(row => {
    const r = row as Record<string, unknown>;
    return keys.map(k => escapeCsvCell(formatCellValue(k, r[k]))).join(',');
  });

  return [header, ...rows].join('\n');
}

// Characters that trigger formula evaluation in Excel / LibreOffice Calc /
// Google Sheets when they appear at the start of a cell. Prefixing such a
// value with a single quote neutralizes the formula (OWASP-recommended;
// CWE-1236). We skip neutralization for values that originated as numbers,
// since negative amounts like "-25.00" would otherwise be quoted as text.
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

function escapeCsvCell({ value, isNumeric }: FormattedCell): string {
  if (!isNumeric && FORMULA_TRIGGERS.test(value)) {
    value = "'" + value;
  }
  return escapeCsv(value);
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function printOutput(data: unknown, format: OutputFormat = 'json') {
  process.stdout.write(formatOutput(data, format) + '\n');
}
