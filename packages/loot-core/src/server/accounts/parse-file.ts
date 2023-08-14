import csv2json from 'csv-parse/lib/sync';
import { parseStringPromise } from 'xml2js';

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
  return { errors, transactions: [] };
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

  let data;
  try {
    data = await parse(contents);
  } catch (err) {
    errors.push({
      message: 'Failed importing file',
      internal: err.stack,
    });
    return { errors };
  }

  return {
    errors,
    transactions: getStmtTrn(data).map(mapTransaction),
  };
}

function getStmtTrn(data) {
  let ofx = data?.['OFX'];
  let isCc = ofx?.['CREDITCARDMSGSRSV1'] != null;
  let msg = isCc ? ofx?.['CREDITCARDMSGSRSV1'] : ofx?.['BANKMSGSRSV1'];
  let stmtTrnRs = msg?.[`${isCc ? 'CC' : ''}STMTTRNRS`];
  let stmtRs = stmtTrnRs?.[`${isCc ? 'CC' : ''}STMTRS`];
  let bankTranList = stmtRs?.['BANKTRANLIST'];
  // Could be an array or a single object.
  // xml2js serializes single item to an object and multiple to an array.
  let stmtTrn = bankTranList?.['STMTTRN'];
  if (!Array.isArray(stmtTrn)) {
    return [stmtTrn];
  }
  return stmtTrn;
}

function mapTransaction(stmtTrn) {
  // Banks don't always implement the OFX standard properly
  // If no payee is available try and fallback to memo
  let useName = stmtTrn['NAME'] != null;
  // YYYYMMDDHHMMSS format. We just need the date.
  let dtPosted = stmtTrn['DTPOSTED'];
  let transactionDate = dtPosted
    ? new Date(
        Number(dtPosted.substring(0, 4)), // year
        Number(dtPosted.substring(4, 6)) - 1, // month (zero-based index)
        Number(dtPosted.substring(6, 8)), // date
      )
    : null;

  return {
    amount: stmtTrn['TRNAMT'],
    imported_id: stmtTrn['FITID'],
    date: dayFromDate(transactionDate),
    payee_name: useName ? stmtTrn['NAME'] : stmtTrn['MEMO'],
    imported_payee: useName ? stmtTrn['NAME'] : stmtTrn['MEMO'],
    notes: useName ? stmtTrn['MEMO'] || null : null, //memo used for payee
  };
}

function sgml2Xml(sgml) {
  return sgml
    .replace(/>\s+</g, '><') // remove whitespace inbetween tag close/open
    .replace(/\s+</g, '<') // remove whitespace before a close tag
    .replace(/>\s+/g, '>') // remove whitespace after a close tag
    .replace(/<([A-Z\d_]*)+\.+([A-Z\d_]*)>([^<]+)/g, '<$1$2>$3') // Remove dots in start-tags names and remove end-tags with dots
    .replace(/<(\w+?)>([^<]+)/g, '<$1>$2</$1>'); // Add a new end-tags for the ofx elements
}

async function parseXml(content) {
  return await parseStringPromise(content, { explicitArray: false });
}

async function parse(data) {
  // firstly, split into the header attributes and the footer sgml
  const ofx = data.split('<OFX>', 2);

  // firstly, parse the headers
  const headerString = ofx[0].split(/\r?\n/);
  const header = {};
  headerString.forEach(attrs => {
    const headAttr = attrs.split(/:/, 2);
    header[headAttr[0]] = headAttr[1];
  });

  // make the SGML and the XML
  const content = `<OFX>${ofx[1]}`;

  // Parse the XML/SGML portion of the file into an object
  // Try as XML first, and if that fails do the SGML->XML mangling
  let dataParsed = null;
  try {
    dataParsed = await parseXml(content);
  } catch (e) {
    let converted = sgml2Xml(content);
    dataParsed = await parseXml(converted);
  }

  // put the headers into the returned data
  dataParsed.header = header;

  return dataParsed;
}
