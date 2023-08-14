import csv2json from 'csv-parse/lib/sync';
import { Ofx } from 'ofx-data-extractor';

import * as fs from '../../platform/server/fs';
import { dayFromDate } from '../../shared/months';
import { looselyParseAmount } from '../../shared/util';

import qif2json from './qif2json';

type ParseError = { message: string; internal: string };
export type ParseFileResult = {
  errors?: ParseError[];
  transactions?: unknown[];
};

export async function parseFile(
  filepath,
  options?: { delimiter?: string; hasHeaderRow: boolean },
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
        return parseCSV(filepath, options);
      case '.ofx':
      case '.qfx':
        return parseOFX(filepath);
      default:
    }
  }

  errors.push({
    message: 'Invalid file type',
    internal: '',
  });
  return { errors, transactions: undefined };
}

async function parseCSV(
  filepath,
  options: { delimiter?: string; hasHeaderRow: boolean } = {
    hasHeaderRow: true,
  },
): Promise<ParseFileResult> {
  let errors = Array<ParseError>();
  let contents = await fs.readFile(filepath);

  let data;
  try {
    data = csv2json(contents, {
      columns: options.hasHeaderRow,
      bom: true,
      delimiter: options.delimiter || ',',
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
  let errors = Array<ParseError>();
  let contents = await fs.readFile(filepath);

  let stmtTrn;
  try {
    let ofx = new Ofx(contents);
    stmtTrn = ofx.getBankTransferList();
  } catch (err) {
    errors.push({
      message: 'Failed importing file',
      internal: err.stack,
    });
    return { errors };
  }

  return {
    errors,
    transactions: stmtTrn.map(mapTransaction),
  };
}

function mapTransaction(stmtTrn) {
  // Banks don't always implement the OFX standard properly
  // If no payee is available try and fallback to memo
  let useName = stmtTrn['NAME'] != null;
  return {
    amount: stmtTrn['TRNAMT'],
    imported_id: stmtTrn['FITID'],
    date: dayFromDate(stmtTrn['DTPOSTED']),
    payee_name: useName ? stmtTrn['NAME'] : stmtTrn['MEMO'],
    imported_payee: useName ? stmtTrn['NAME'] : stmtTrn['MEMO'],
    notes: useName ? stmtTrn['MEMO'] || null : null, //memo used for payee
  };
}
