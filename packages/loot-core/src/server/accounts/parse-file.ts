// @ts-strict-ignore
import csv2json from 'csv-parse/lib/sync';

import * as fs from '../../platform/server/fs';
import { looselyParseAmount } from '../../shared/util';

import { ofx2json } from './ofx2json';
import { qif2json } from './qif2json';
import { xmlCAMT2json } from './xmlcamt2json';

type ParseError = { message: string; internal: string };
export type ParseFileResult = {
  errors?: ParseError[];
  transactions?: unknown[];
};

type ParseFileOptions = {
  hasHeaderRow?: boolean;
  delimiter?: string;
  fallbackMissingPayeeToMemo?: boolean;
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
        return parseQIF(filepath);
      case '.csv':
      case '.tsv':
        return parseCSV(filepath, options);
      case '.ofx':
      case '.qfx':
        return parseOFX(filepath, options);
      case '.xml':
        return parseCAMT(filepath);
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
  const contents = await fs.readFile(filepath);

  let data;
  try {
    data = csv2json(contents, {
      columns: options?.hasHeaderRow,
      bom: true,
      delimiter: options?.delimiter || ',',
      // eslint-disable-next-line rulesdir/typography
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

async function parseQIF(filepath: string): Promise<ParseFileResult> {
  const errors = Array<ParseError>();
  const contents = await fs.readFile(filepath);

  let data;
  try {
    data = qif2json(contents);
  } catch (err) {
    errors.push({
      message: 'Failed parsing: doesn’t look like a valid QIF file.',
      internal: err.stack,
    });
    return { errors, transactions: [] };
  }

  return {
    errors: [],
    transactions: data.transactions
      .map(trans => ({
        amount: trans.amount != null ? looselyParseAmount(trans.amount) : null,
        date: trans.date,
        payee_name: trans.payee,
        imported_payee: trans.payee,
        notes: trans.memo || null,
      }))
      .filter(trans => trans.date != null && trans.amount != null),
  };
}

async function parseOFX(
  filepath: string,
  options: ParseFileOptions,
): Promise<ParseFileResult> {
  const errors = Array<ParseError>();
  const contents = await fs.readFile(filepath);

  let data;
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

  return {
    errors,
    transactions: data.transactions.map(trans => {
      return {
        amount: Number(trans.amount),
        imported_id: trans.fitId,
        date: trans.date,
        payee_name: trans.name || (useMemoFallback ? trans.memo : null),
        imported_payee: trans.name || (useMemoFallback ? trans.memo : null),
        notes: !!trans.name || !useMemoFallback ? trans.memo || null : null, //memo used for payee
      };
    }),
  };
}

async function parseCAMT(filepath: string): Promise<ParseFileResult> {
  const errors = Array<ParseError>();
  const contents = await fs.readFile(filepath);

  let data;
  try {
    data = await xmlCAMT2json(contents);
  } catch (err) {
    console.error(err);
    errors.push({
      message: 'Failed importing file',
      internal: err.stack,
    });
    return { errors };
  }

  return { errors, transactions: data };
}
