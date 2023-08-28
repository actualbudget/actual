import csv2json from 'csv-parse/lib/sync';

import * as fs from '../../platform/server/fs';
import { dayFromDate } from '../../shared/months';
import { looselyParseAmount } from '../../shared/util';

import ofx2json from './ofx2json';
import qif2json from './qif2json';

type ParseError = { message: string; internal: string };
export type ParseFileResult = {
  errors?: ParseError[];
  transactions?: unknown[];
};

type ParseFileOptions = {
  hasHeaderRow?: boolean;
  delimiter?: string;
  fallbackMissingPayeeToMemo?: boolean;
  enableExperimentalOfxParser?: boolean;
};

export async function parseFile(
  filepath,
  options?: ParseFileOptions,
): Promise<ParseFileResult> {
  let errors = Array<ParseError>();
  let m = filepath.match(/\.[^.]*$/);

  if (m) {
    let ext = m[0];

    switch (ext.toLowerCase()) {
      case '.qif':
        return parseQIF(filepath);
      case '.csv':
      case '.tsv':
        return parseCSV(filepath, options?.hasHeaderRow, options?.delimiter);
      case '.ofx':
      case '.qfx':
        if (options?.enableExperimentalOfxParser) {
          return parseOFX(filepath);
        } else {
          return parseOFXNodeLibOFX(filepath, options);
        }
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
  hasHeaderRow = true,
  delimiter?: string,
): Promise<ParseFileResult> {
  let errors = Array<ParseError>();
  let contents = await fs.readFile(filepath);

  let data;
  try {
    data = csv2json(contents, {
      columns: hasHeaderRow,
      bom: true,
      delimiter: delimiter || ',',
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

async function parseQIF(filepath): Promise<ParseFileResult> {
  let errors = Array<ParseError>();
  let contents = await fs.readFile(filepath);

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
    transactions: data.transactions.map(trans => ({
      amount: trans.amount != null ? looselyParseAmount(trans.amount) : null,
      date: trans.date,
      payee_name: trans.payee,
      imported_payee: trans.payee,
      notes: trans.memo || null,
    })),
  };
}

async function parseOFX(filepath): Promise<ParseFileResult> {
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

  return {
    errors,
    transactions: data.transactions.map(trans => {
      // Banks don't always implement the OFX standard properly
      // If no payee is available try and fallback to memo
      const useName = trans.name != null;
      return {
        amount: trans.amount,
        imported_id: trans.fitId,
        date: trans.date,
        payee_name: useName ? trans.name : trans.memo,
        imported_payee: useName ? trans.name : trans.memo,
        notes: useName ? trans.memo || null : null, //memo used for payee
      };
    }),
  };
}

async function parseOFXNodeLibOFX(filepath, options): Promise<ParseFileResult> {
  let { getOFXTransactions, initModule } = await import(
    /* webpackChunkName: 'xfo' */ 'node-libofx'
  );
  await initModule();

  let errors = Array<ParseError>();
  let contents = await fs.readFile(filepath, 'binary');

  let data;
  try {
    data = getOFXTransactions(contents);
  } catch (err) {
    errors.push({
      message: 'Failed importing file',
      internal: err.stack,
    });
    return { errors };
  }

  // Banks don't always implement the OFX standard properly
  // If no payee is available try and fallback to memo
  let useMemoFallback = options.fallbackMissingPayeeToMemo;

  return {
    errors,
    transactions: data.map(trans => ({
      amount: trans.amount,
      imported_id: trans.fi_id,
      date: trans.date ? dayFromDate(new Date(trans.date * 1000)) : null,
      payee_name: trans.name || (useMemoFallback ? trans.memo : null),
      imported_payee: trans.name || (useMemoFallback ? trans.memo : null),
      notes: !!trans.name || !useMemoFallback ? trans.memo || null : null, //memo used for payee
    })),
  };
}
