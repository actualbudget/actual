import ofx from '@wademason/ofx';
import csv2json from 'csv-parse/lib/sync';

import * as fs from '../../platform/server/fs';
import { dayFromDate } from '../../shared/months';
import { looselyParseAmount } from '../../shared/util';

import qif2json from './qif2json';

export function parseFile(filepath, options?: unknown) {
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
    internal: '',
  });
  return { errors, transactions: undefined };
}

async function parseCSV(filepath, options: { delimiter?: string } = {}) {
  let errors = [];
  let contents = await fs.readFile(filepath);

  let data;
  try {
    data = csv2json(contents, {
      columns: true,
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

async function parseQIF(filepath) {
  let errors = [];
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
    errors,
    transactions: data.transactions.map(trans => ({
      amount: trans.amount != null ? looselyParseAmount(trans.amount) : null,
      date: trans.date,
      payee_name: trans.payee,
      imported_payee: trans.payee,
      notes: trans.memo || null,
    })),
  };
}

// Extracts the YYYY-MM-DD from the following formats:
/// * YYYYMMDDHHMMSS.XXX[gmt offset:tz name] (official OFX format)
/// * 20190123120000
/// If an OFX/QFX file is seen with a different format, it should
/// be supported by this function, even if it is not spec-compliant.
function ofxDateParse(raw) {
  const longRx =
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\.\d{3})?\[(.+):(.+)\]$/;
  const shortRx = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;
  let res = longRx.exec(raw);
  if (res) {
    const [_, y, m, day, _hr, _min, _sec, _milli, _offsetStr, _tz] = res;
    return `${y}-${m}-${day}`;
  } else {
    res = shortRx.exec(raw);
    if (res) {
      const [_, y, m, day, _hr, _min, _sec] = res;
      return `${y}-${m}-${day}`;
    }
  }
  console.warn('Not able to parse date', raw);
  return null;
}

async function parseOFX(filepath) {
  let objectEq = (arg1, arg2) => {
    if (
      Object.prototype.toString.call(arg1) ===
      Object.prototype.toString.call(arg2)
    ) {
      if (
        Object.prototype.toString.call(arg1) === '[object Object]' ||
        Object.prototype.toString.call(arg1) === '[object Array]'
      ) {
        if (Object.keys(arg1).length !== Object.keys(arg2).length) {
          return false;
        }
        return Object.keys(arg1).every(function (key) {
          return objectEq(arg1[key], arg2[key]);
        });
      } else if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        return Math.abs(arg1 - arg2) < Number.EPSILON;
      }
      return arg1 === arg2;
    } else if (
      (arg1 === undefined || arg1 === null) &&
      (arg2 === undefined || arg2 === null)
    ) {
      return true;
    }
    return false;
  };
  const { transactions: oldTrans, errors: oldErrors } =
    await parseOfxNodeLibofx(filepath);
  const { transactions: newTrans, errors: newErrors } =
    await parseOfxJavascript(filepath);
  // send fine-grained information about how the parsing went, comparatively.
  if (oldErrors.length > 0 && newErrors.length > 0) {
    return {
      ofxParser: true,
      which: 'both',
      errors: {
        length: oldErrors.length + newErrors.length,
        oldErrors,
        newErrors,
      },
    };
  } else if (oldErrors.length > 0) {
    return {
      ofxParser: true,
      which: 'old',
      errors: {
        length: oldErrors.length,
        oldErrors,
      },
      transactions: newTrans,
    };
  } else if (newErrors.length > 0) {
    return {
      ofxParser: true,
      which: 'new',
      errors: {
        length: newErrors.length,
        newErrors,
      },
      transactions: oldTrans,
    };
  } else {
    if (objectEq(oldTrans, newTrans)) {
      return {
        ofxParser: true,
        which: 'none',
        errors: [],
        transactions: oldTrans,
      };
    } else {
      return {
        ofxParser: true,
        which: 'diff',
        errors: [],
        oldTrans: oldTrans,
        newTrans: newTrans,
      };
    }
  }
}

async function parseOfxJavascript(filepath) {
  let errors = [];

  let data;
  let transactions;
  try {
    // 'binary' should be equal to latin1 in node.js
    // not sure about browser. We want latin1 and not utf8.
    // For some reason, utf8 does not parse ofx files correctly here.
    const contents = new TextDecoder('latin1').decode(
      (await fs.readFile(filepath, 'binary')) as Buffer,
    );
    data = ofx.parse(contents);
    // .STMTTRN may be a list or a single object.
    transactions = [
      (
        data.body.OFX.BANKMSGSRSV1?.STMTTRNRS.STMTRS ||
        data.body.OFX.CREDITCARDMSGSRSV1?.CCSTMTTRNRS.CCSTMTRS
      ).BANKTRANLIST.STMTTRN,
    ].flat();
  } catch (err) {
    errors.push({
      message: 'Failed importing file',
      internal: err.stack,
    });
    return { errors };
  }
  return {
    errors,
    transactions: transactions.map(trans => ({
      amount: parseFloat(trans.TRNAMT._text),
      imported_id: trans.FITID._text,
      date: trans.DTPOSTED ? ofxDateParse(trans.DTPOSTED._text) : null,
      payee_name: trans.NAME?._text,
      imported_payee: trans.NAME?._text,
      notes: trans.MEMO?._text,
    })),
  };
}

async function parseOfxNodeLibofx(filepath) {
  let { getOFXTransactions, initModule } = await import(
    /* webpackChunkName: 'xfo' */ 'node-libofx'
  );
  await initModule();

  let errors = [];
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

  return {
    errors,
    transactions: data.map(trans => ({
      amount: trans.amount,
      imported_id: trans.fi_id,
      date: trans.date ? dayFromDate(trans.date * 1000) : null,
      payee_name: trans.name,
      imported_payee: trans.name,
      notes: trans.memo || null,
    })),
  };
}
