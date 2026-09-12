// @ts-strict-ignore
import { parse as csv2json } from 'csv-parse/sync';

import * as fs from '#platform/server/fs';
import { logger } from '#platform/server/log';
import { looselyParseAmount } from '#shared/util';

import { ofx2json } from './ofx2json';
import { qif2json } from './qif2json';
import { xmlCAMT2json } from './xmlcamt2json';

/**
 * Parse OFX amount strings to numbers.
 * Handles various OFX amount formats including currency symbols, parentheses, and multiple decimal places.
 * Returns null for invalid amounts instead of NaN.
 */
function parseOfxAmount(amount: string): number | null {
  if (!amount || typeof amount !== 'string') {
    return null;
  }

  // Handle parentheses for negative amounts (e.g., "(30.00)" -> "-30.00")
  let cleaned = amount.trim();
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  // Remove currency symbols and other non-numeric characters except decimal point and minus sign
  cleaned = cleaned.replace(/[^\d.-]/g, '');

  // Handle multiple decimal points by keeping only the first one
  const decimalIndex = cleaned.indexOf('.');
  if (decimalIndex !== -1) {
    const beforeDecimal = cleaned.slice(0, decimalIndex);
    const afterDecimal = cleaned.slice(decimalIndex + 1).replace(/\./g, '');
    cleaned = beforeDecimal + '.' + afterDecimal;
  }

  // Ensure we have a valid number format
  if (!cleaned || cleaned === '-' || cleaned === '.') {
    return null;
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

type StructuredTransaction = {
  amount: number;
  date: string;
  payee_name: string;
  imported_payee: string;
  notes: string;
  category?: string | null;
};

/**
 * Decode raw CSV file bytes into a string. A user-provided encoding always
 * wins; otherwise the encoding is detected in layers: the byte order mark,
 * BOM-less UTF-16 (text never contains NUL bytes), strict UTF-8 validation,
 * and finally a windows-1252 fallback which also decodes ISO-8859-1 content.
 */
function decodeCsvBytes(bytes: Uint8Array, encoding?: string): string {
  if (encoding && encoding !== 'auto') {
    return new TextDecoder(encoding).decode(bytes);
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xfe &&
    bytes[2] !== 0x00
  ) {
    return new TextDecoder('utf-16le').decode(bytes);
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes);
  }

  const bomlessUtf16 = detectBomlessUtf16(bytes);
  if (bomlessUtf16 != null) {
    return new TextDecoder(bomlessUtf16).decode(bytes);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // A mostly-valid UTF-8 file (a few corrupted bytes) decodes better as
    // UTF-8 with replacement characters than as windows-1252; a genuine
    // legacy code page file turns almost every non-ASCII byte into one.
    const loose = new TextDecoder('utf-8').decode(bytes);
    const replacements = (loose.match(/\uFFFD/g) || []).length;
    let highBytes = 0;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] >= 0x80) {
        highBytes++;
      }
    }
    return highBytes > 0 && replacements / highBytes < 0.5
      ? loose
      : new TextDecoder('windows-1252').decode(bytes);
  }
}

function detectBomlessUtf16(bytes: Uint8Array): string | null {
  let evenNuls = 0;
  let oddNuls = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x00) {
      if (i % 2 === 0) {
        evenNuls++;
      } else {
        oddNuls++;
      }
    }
  }

  // Text never contains NUL bytes, so a significant NUL presence indicates
  // UTF-16; the dominant parity of their positions gives the endianness.
  // Contiguous NUL padding splits evenly across both parities, so require
  // one parity to clearly dominate before treating the file as UTF-16.
  const nulCount = evenNuls + oddNuls;
  const dominantNuls = Math.max(evenNuls, oddNuls);
  if (nulCount < bytes.length / 10 || dominantNuls / nulCount < 0.9) {
    return null;
  }

  return evenNuls > oddNuls ? 'utf-16be' : 'utf-16le';
}

// CSV files return raw data that are not guaranteed to be StructuredTransactions
type CsvTransaction = Record<string, string> | string[];

type Transaction = StructuredTransaction | CsvTransaction;

type ParseError = { message: string; internal: string };
export type ParseFileResult = {
  errors: ParseError[];
  transactions?: Transaction[];
};

export type ParseFileOptions = {
  hasHeaderRow?: boolean;
  delimiter?: string;
  fallbackMissingPayeeToMemo?: boolean;
  swapPayeeAndMemo?: boolean;
  skipStartLines?: number;
  skipEndLines?: number;
  importNotes?: boolean;
  encoding?: string;
};

export async function parseFile(
  filepath: string,
  options: ParseFileOptions = {},
): Promise<ParseFileResult> {
  const errors = Array<ParseError>();
  const m = filepath.match(/\.[^.]*$/);

  if (m) {
    const ext = m[0];

    switch (ext.toLowerCase()) {
      case '.qif':
        return parseQIF(filepath, options);
      case '.csv':
      case '.tsv':
        return parseCSV(filepath, options);
      case '.ofx':
      case '.qfx':
        return parseOFX(filepath, options);
      case '.xml':
        return parseCAMT(filepath, options);
      default:
    }
  }

  errors.push({
    message: 'Invalid file type',
    internal: '',
  });
  return { errors, transactions: [] };
}

async function parseCSV(
  filepath: string,
  options: ParseFileOptions,
): Promise<ParseFileResult> {
  const errors = Array<ParseError>();
  const bytes = await fs.readFile(filepath, 'binary');

  let contents: string;
  try {
    contents = decodeCsvBytes(bytes, options.encoding);
  } catch (err) {
    errors.push({
      message: 'Failed parsing: ' + err.message,
      internal: err.message,
    });
    return { errors, transactions: [] };
  }

  const skipStart = Math.max(0, options.skipStartLines || 0);
  const skipEnd = Math.max(0, options.skipEndLines || 0);

  if (skipStart > 0 || skipEnd > 0) {
    const lines = contents.split(/\r?\n/);

    if (skipStart + skipEnd >= lines.length) {
      errors.push({
        message: 'Cannot skip more lines than exist in the file',
        internal: `Attempted to skip ${skipStart} start + ${skipEnd} end lines from ${lines.length} total lines`,
      });
      return { errors, transactions: [] };
    }

    const startLine = skipStart;
    const endLine = skipEnd > 0 ? lines.length - skipEnd : lines.length;
    contents = lines.slice(startLine, endLine).join('\r\n');
  }

  let data: ReturnType<typeof csv2json>;
  try {
    data = csv2json(contents, {
      columns: options?.hasHeaderRow,
      bom: true,
      delimiter: options?.delimiter || ',',

      quote: '"',
      trim: true,
      relax_column_count: true,
      skip_empty_lines: true,
    });
  } catch (err) {
    errors.push({
      message: 'Failed parsing: ' + err.message,
      internal: err.message,
    });
    return { errors, transactions: [] };
  }

  return { errors, transactions: data };
}

async function parseQIF(
  filepath: string,
  options: ParseFileOptions = {},
): Promise<ParseFileResult> {
  const errors = Array<ParseError>();
  const contents = await fs.readFile(filepath);

  let data: ReturnType<typeof qif2json>;
  try {
    data = qif2json(contents);
  } catch (err) {
    errors.push({
      message: "Failed parsing: doesn't look like a valid QIF file.",
      internal: err.stack,
    });
    return { errors, transactions: [] };
  }

  const swap = options.swapPayeeAndMemo;

  return {
    errors: [],
    transactions: data.transactions
      .map(trans => {
        const payeeSource = swap ? trans.memo : trans.payee;
        const memoSource = swap ? trans.payee : trans.memo;
        const fallbackUsed = !payeeSource && swap;

        return {
          amount:
            trans.amount != null ? looselyParseAmount(trans.amount) : null,
          date: trans.date,
          payee_name: payeeSource || (fallbackUsed ? memoSource : null),
          imported_payee: payeeSource || (fallbackUsed ? memoSource : null),
          category: trans.subcategory || trans.category || null,
          notes:
            options.importNotes && !fallbackUsed ? memoSource || null : null,
        };
      })
      .filter(trans => trans.date != null && trans.amount != null),
  };
}

async function parseOFX(
  filepath: string,
  options: ParseFileOptions,
): Promise<ParseFileResult> {
  const errors = Array<ParseError>();
  const contents = await fs.readFile(filepath, 'binary');

  let data: Awaited<ReturnType<typeof ofx2json>>;
  try {
    data = await ofx2json(contents);
  } catch (err) {
    errors.push({
      message: 'Failed importing file',
      internal: err.stack,
    });
    return { errors };
  }

  // Banks don't always implement the OFX standard properly
  // If no payee is available try and fallback to memo
  const useMemoFallback = options.fallbackMissingPayeeToMemo;
  const swap = options.swapPayeeAndMemo;

  return {
    errors,
    transactions: data.transactions.map(trans => {
      const parsedAmount = parseOfxAmount(trans.amount);
      if (parsedAmount === null) {
        errors.push({
          message: `Invalid amount format: ${trans.amount}`,
          internal: `Failed to parse amount: ${trans.amount}`,
        });
      }

      const payeeSource = swap ? trans.memo : trans.name;
      const memoSource = swap ? trans.name : trans.memo;
      const fallbackUsed = !payeeSource && useMemoFallback;

      return {
        amount: parsedAmount || 0,
        imported_id: trans.fitId,
        date: trans.date,
        payee_name: payeeSource || (fallbackUsed ? memoSource : null),
        imported_payee: payeeSource || (fallbackUsed ? memoSource : null),
        notes: options.importNotes && !fallbackUsed ? memoSource || null : null,
      };
    }),
  };
}

async function parseCAMT(
  filepath: string,
  options: ParseFileOptions = {},
): Promise<ParseFileResult> {
  const errors = Array<ParseError>();
  // Read the raw bytes so xmlCAMT2json can honor the encoding declared in
  // the XML header instead of decoding the file as UTF-8.
  const contents = await fs.readFile(filepath, 'binary');

  let data: Awaited<ReturnType<typeof xmlCAMT2json>>;
  try {
    data = await xmlCAMT2json(contents);
  } catch (err) {
    logger.error(err);
    errors.push({
      message: 'Failed importing file',
      internal: err.stack,
    });
    return { errors };
  }

  const swap = options.swapPayeeAndMemo;

  return {
    errors,
    transactions: data.map(trans => {
      const payeeSource = swap ? trans.notes : trans.payee_name;
      const memoSource = swap ? trans.payee_name : trans.notes;
      const fallbackUsed = !payeeSource && swap;

      return {
        ...trans,
        payee_name: payeeSource || (fallbackUsed ? memoSource : null),
        imported_payee: payeeSource || (fallbackUsed ? memoSource : null),
        notes: options.importNotes && !fallbackUsed ? memoSource || null : null,
      };
    }),
  };
}
