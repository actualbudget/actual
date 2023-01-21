import csv2json from 'csv-parse/lib/sync';

import fs from '../../platform/server/fs';
import { dayFromDate } from '../../shared/months';
import { looselyParseAmount } from '../../shared/util';

import qif2json from './qif2json';

export function parseFile(filepath, options) {
  let errors = [];
  let m = filepath.match(/\.[^.]*$/);

  if (m) {
    let ext = m[0];

    switch (ext.toLowerCase()) {
      case '.qif':
        return parseQIF(filepath);
      case '.csv':
        return parseCSV(filepath, options);
      case '.ofx':
      case '.qfx':
        return parseOFX(filepath);
      default:
    }
  }

  errors.push({
    message: 'Invalid file type',
    internal: ''
  });
  return { errors };
}

async function parseCSV(filepath, options = {}) {
  let errors = [];
  let contents = await fs.readFile(filepath);

  let data;
  try {
    data = csv2json(contents, {
      columns: true,
      bom: true,
      delimiter: options.delimiter || ',',
      quote: '"',
      trim: true,
      relax_column_count: true
    });
  } catch (err) {
    errors.push({
      message: 'Failed parsing: ' + err.message,
      internal: err.message
    });
    return { errors, transactions: [] };
  }

  return { errors, transactions: data };
}

async function parseQIF(filepath) {
  let errors = [];
  let contents = await fs.readFile(filepath);

  let data;
  try {
    data = qif2json(contents);
  } catch (err) {
    errors.push({
      message: "Failed parsing: doesn't look like a valid QIF file.",
      internal: err.stack
    });
    return { errors, transactions: [] };
  }

  return {
    errors,
    transactions: data.transactions.map(trans => ({
      amount: trans.amount != null ? looselyParseAmount(trans.amount) : null,
      date: trans.date,
      payee_name: trans.payee,
      imported_payee: trans.payee,
      notes: trans.memo || null
    }))
  };
}

async function parseOFX(filepath) {
  let { getOFXTransactions, initModule } = await import(
    /* webpackChunkName: 'xfo' */ 'node-libofx'
  );
  await initModule();

  let errors = [];
  let contents = await fs.readFile(filepath);

  let data;
  try {
    data = getOFXTransactions(contents);
  } catch (err) {
    errors.push({
      message: 'Failed importing file',
      internal: err.stack
    });
    return { errors };
  }

  return {
    errors,
    transactions: data.map(trans => ({
      amount: trans.amount,
      imported_id: trans.fi_id,
      date: trans.date ? dayFromDate(trans.date * 1000) : null,
      payee_name: trans.name,
      imported_payee: trans.name,
      notes: trans.memo || null
    }))
  };
}
