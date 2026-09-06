export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseBoolFlag(value: string, flagName: string): boolean {
  if (value !== 'true' && value !== 'false') {
    throw new Error(
      `Invalid ${flagName}: "${value}". Expected "true" or "false".`,
    );
  }
  return value === 'true';
}

export function parseIntFlag(value: string, flagName: string): number {
  const parsed = value.trim() === '' ? NaN : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${flagName}: "${value}". Expected an integer.`);
  }
  return parsed;
}

export function parseNonNegativeIntFlag(
  value: string,
  flagName: string,
): number {
  const parsed = parseIntFlag(value, flagName);
  if (parsed < 0) {
    throw new Error(
      `Invalid ${flagName}: "${value}". Expected a non-negative integer.`,
    );
  }
  return parsed;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Parse a human-entered amount ("1,234.56", "$-12.30", "(45.00)", "-7")
 * into integer cents. Throws on anything that is not a number.
 */
export function parseAmountToCents(raw: string, flagName = 'amount'): number {
  let text = raw.trim();
  if (text === '') {
    throw new Error(`Invalid ${flagName}: empty value`);
  }
  let negative = false;
  if (text.startsWith('(') && text.endsWith(')')) {
    negative = true;
    text = text.slice(1, -1);
  }
  text = text.replace(/[$€£¥\s,]/g, '');
  if (text.startsWith('-')) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }
  if (!/^\d*(\.\d*)?$/.test(text) || text === '' || text === '.') {
    throw new Error(`Invalid ${flagName}: "${raw}". Expected a number.`);
  }
  const [whole = '0', frac = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2) || '0');
  // Round any third decimal place by looking at the raw fraction.
  const rounded = frac.length > 2 && Number(frac[2]) >= 5 ? cents + 1 : cents;
  return negative ? -rounded : rounded;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertMonth(value: string, flagName = '--month'): string {
  if (!MONTH_PATTERN.test(value)) {
    throw new Error(`Invalid ${flagName}: "${value}". Expected YYYY-MM.`);
  }
  return value;
}

export function assertDate(value: string, flagName: string): string {
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`Invalid ${flagName}: "${value}". Expected YYYY-MM-DD.`);
  }
  return value;
}

export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  const mon = (total % 12) + 1;
  return `${year}-${String(mon).padStart(2, '0')}`;
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

/** Inclusive list of months from `start` to `end`. */
export function monthRange(start: string, end: string): string[] {
  const months: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

/** Resolve `--month` / `--start` / `--end` flags to a date range. */
export function resolveDateRange(cmdOpts: {
  month?: string;
  start?: string;
  end?: string;
}): { start: string; end: string } {
  if (cmdOpts.month && (cmdOpts.start || cmdOpts.end)) {
    throw new Error('--month cannot be combined with --start/--end');
  }
  if (cmdOpts.month) {
    const month = assertMonth(cmdOpts.month);
    return { start: monthStart(month), end: monthEnd(month) };
  }
  if (cmdOpts.start || cmdOpts.end) {
    if (!cmdOpts.start || !cmdOpts.end) {
      throw new Error('--start and --end must be provided together');
    }
    const start = assertDate(cmdOpts.start, '--start');
    const end = assertDate(cmdOpts.end, '--end');
    if (start > end) {
      throw new Error('--start must be on or before --end');
    }
    return { start, end };
  }
  const month = currentMonth();
  return { start: monthStart(month), end: monthEnd(month) };
}

/**
 * Normalize a date string in the given format (e.g. "MM/DD/YYYY") to
 * YYYY-MM-DD. With no format, accepts ISO dates, M/D/YYYY and D.M.YYYY.
 */
export function normalizeDate(raw: string, format?: string): string {
  const text = raw.trim();
  if (format) {
    const tokens = format.match(/YYYY|YY|MM|DD|M|D/g) ?? [];
    const separators = format.split(/YYYY|YY|MM|DD|M|D/).filter(Boolean);
    const escaped = separators.map(s =>
      s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    );
    let pattern = '^';
    tokens.forEach((token, i) => {
      pattern += token.startsWith('Y') ? '(\\d{2,4})' : '(\\d{1,2})';
      if (i < escaped.length) pattern += escaped[i];
    });
    pattern += '$';
    const match = text.match(new RegExp(pattern));
    if (!match) {
      throw new Error(`Date "${raw}" does not match format ${format}`);
    }
    let year = '',
      month = '',
      day = '';
    tokens.forEach((token, i) => {
      const value = match[i + 1];
      if (token.startsWith('Y')) {
        year = value.length === 2 ? '20' + value : value;
      } else if (token.startsWith('M')) {
        month = value;
      } else {
        day = value;
      }
    });
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (DATE_PATTERN.test(text)) return text;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (us) {
    const year = us[3].length === 2 ? '20' + us[3] : us[3];
    return `${year}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  }
  const eu = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (eu) {
    const year = eu[3].length === 2 ? '20' + eu[3] : eu[3];
    return `${year}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}`;
  }
  throw new Error(
    `Unrecognized date "${raw}". Use --date-format to describe it (e.g. MM/DD/YYYY).`,
  );
}

export function parseBoolEnv(
  raw: string | undefined,
  source: string,
): boolean | undefined {
  if (raw === undefined) return undefined;
  const lower = raw.toLowerCase();
  if (raw === '1' || lower === 'true') return true;
  if (raw === '0' || lower === 'false') return false;
  throw new Error(
    `Invalid ${source}: "${raw}". Expected "true", "false", "1", or "0".`,
  );
}
