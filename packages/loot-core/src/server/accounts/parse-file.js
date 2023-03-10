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
      case '.xml':
        return parseCAMT053(filepath, options);
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

function parseCAMT053Entries(data) {
  let out = [];

  data.forEach(element => {
    let tmp = {};
    tmp.date = element.ValDt.Dt._text;
    
    if (element.CdtDbtInd._text == "DBIT") {
      tmp.amount = -looselyParseAmount(element.Amt._text);
    } else {
      tmp.amount = looselyParseAmount(element.Amt._text);
    }
    
    if (typeof element.NtryDtls === 'undefined' || element.NtryDtls === null) {
      tmp.payee_name = null;
      
      if (typeof element.BkTxCd !== 'undefined' || element.BkTxCd !== null) {
        
        // Specific for ABNAMRO, retrieve Payee name when paying by card in a store
        if (element.BkTxCd.Domn.Cd._text == 'PMNT' &&
        element.BkTxCd.Domn.Fmly.Cd._text == 'CCRD' &&
        element.BkTxCd.Domn.Fmly.SubFmlyCd._text == 'POSD' &&
        element.AddtlNtryInf._text.toString().startsWith('BEA, Betaalpas')) {
          var arr = element.AddtlNtryInf._text.toString().split(",");
          tmp.payee_name = arr[1].toString().replace(' Betaalpas', "").trim();
        } else {
          tmp.payee_name = null;
        }
      }
      
      tmp.imported_payee = tmp.payee_name;
      tmp.notes = element.AddtlNtryInf._text;
      
    } else {
      if (element.CdtDbtInd._text == "DBIT") {
        tmp.payee_name = element.NtryDtls.TxDtls.RltdPties.Cdtr.Nm._text;
      } else {
        tmp.payee_name = element.NtryDtls.TxDtls.RltdPties.Dbtr.Nm._text;
      }
      tmp.imported_payee = tmp.payee_name;
      
      if (typeof element.NtryDtls.TxDtls.RmtInf === 'undefined' || element.NtryDtls.TxDtls.RmtInf === null) {
        tmp.notes = (typeof element.AddtlNtryInf === 'undefined' || element.AddtlNtryInf === null) ? null : element.AddtlNtryInf._text;
      } else {
        tmp.notes = element.NtryDtls.TxDtls.RmtInf.Ustrd._text;
      }
    }
    
    // AcctSvcrRef seems to be unreliable as a unique ID for entries, create our own
    // tmp.imported_id = element.AcctSvcrRef.toString();
    tmp.imported_id = `${tmp.date}_${tmp.payee_name}_${tmp.amount}`;
    console.log("DEBUG: %s", tmp.imported_id);
    
    out.push(tmp);
  }
  
  );
  
  return out;
}

async function parseCAMT053(filepath, options = {}) {
  let errors = [];
  let contents = await fs.readFile(filepath);

  let data;
  try {
    var convert = require('xml-js');

    data = convert.xml2js(contents, {compact: true, spaces: 4, ignoreComment: true, trim: true});
    if (Array.isArray(data.Document.BkToCstmrStmt.Stmt.Ntry)) {
      data = data.Document.BkToCstmrStmt.Stmt.Ntry;
    } else {
      data = [data.Document.BkToCstmrStmt.Stmt.Ntry];
    }

    // CAMT.053 entries have quite a bit of variety so we'll process them seperately
    data = parseCAMT053Entries(data);

  } catch (err) {
    errors.push({
      message: 'Failed parsing: ' + err.message,
      internal: err.message
    });
    return { errors, transactions: [] };
  }

  return {
    errors,
    transactions: data.map(trans => ({
      amount: trans.amount,
      date: trans.date,
      imported_id: trans.imported_id,
      payee_name: trans.payee_name,
      imported_payee: trans.imported_payee,
      notes: trans.notes
    }))
  };
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
  let contents = await fs.readFile(filepath, 'binary');

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
