import { parseStringPromise } from 'xml2js';

import { dayFromDate } from '../../shared/months';

type OFXTransaction = {
  amount: string;
  fitId: string;
  name: string;
  date: string;
  memo: string;
  type: string;
};

type OFXParseResult = {
  headers: Record<string, unknown>;
  transactions: OFXTransaction[];
};

function sgml2Xml(sgml) {
  return sgml
    .replace(/&/g, '&#038;') // Replace ampersands
    .replace(/&amp;/g, '&#038;')
    .replace(/>\s+</g, '><') // remove whitespace inbetween tag close/open
    .replace(/\s+</g, '<') // remove whitespace before a close tag
    .replace(/>\s+/g, '>') // remove whitespace after a close tag
    .replace(/\.(?=[^<>]*>)/g, '') // Remove dots in tag names
    .replace(/<(\w+?)>([^<]+)/g, '<$1>$2</<added>$1>') // Add a new end-tags for the ofx elements
    .replace(/<\/<added>(\w+?)>(<\/\1>)?/g, '</$1>'); // Remove duplicate end-tags
}

async function parseXml(content) {
  return await parseStringPromise(content, { explicitArray: false });
}

function getStmtTrn(data) {
  const ofx = data?.['OFX'];
  if (ofx?.['CREDITCARDMSGSRSV1'] != null) {
    return getCcStmtTrn(ofx);
  } else if (ofx?.['INVSTMTMSGSRSV1'] != null) {
    return getInvStmtTrn(ofx);
  } else {
    return getBankStmtTrn(ofx);
  }
}

function getBankStmtTrn(ofx) {
  const msg = ofx?.['BANKMSGSRSV1'];
  const stmtTrnRs = msg?.['STMTTRNRS'];
  const stmtRs = stmtTrnRs?.['STMTRS'];
  const tranList = stmtRs?.['BANKTRANLIST'];
  // Could be an array or a single object.
  // xml2js serializes single item to an object and multiple to an array.
  const stmtTrn = tranList?.['STMTTRN'];

  if (!Array.isArray(stmtTrn)) {
    return [stmtTrn];
  }
  return stmtTrn;
}

function getCcStmtTrn(ofx) {
  const msg = ofx?.['CREDITCARDMSGSRSV1'];
  const stmtTrnRs = msg?.['CCSTMTTRNRS'];
  const stmtRs = stmtTrnRs?.['CCSTMTRS'];
  const tranList = stmtRs?.['BANKTRANLIST'];
  // Could be an array or a single object.
  // xml2js serializes single item to an object and multiple to an array.
  const stmtTrn = tranList?.['STMTTRN'];

  if (!Array.isArray(stmtTrn)) {
    return [stmtTrn];
  }
  return stmtTrn;
}

function getInvStmtTrn(ofx) {
  const msg = ofx?.['INVSTMTMSGSRSV1'];
  const stmtTrnRs = msg?.['INVSTMTTRNRS'];
  const stmtRs = stmtTrnRs?.['INVSTMTRS'];
  const tranList = stmtRs?.['INVTRANLIST'];
  // Could be an array or a single object.
  // xml2js serializes single item to an object and multiple to an array.
  const stmtTrn = tranList?.['INVBANKTRAN']?.flatMap(t => t?.['STMTTRN']);

  if (!Array.isArray(stmtTrn)) {
    return [stmtTrn];
  }
  return stmtTrn;
}

function mapOfxTransaction(stmtTrn): OFXTransaction {
  // YYYYMMDDHHMMSS format. We just need the date.
  const dtPosted = stmtTrn['DTPOSTED'];
  const transactionDate = dtPosted
    ? new Date(
        Number(dtPosted.substring(0, 4)), // year
        Number(dtPosted.substring(4, 6)) - 1, // month (zero-based index)
        Number(dtPosted.substring(6, 8)), // date
      )
    : null;

  return {
    amount: stmtTrn['TRNAMT'],
    type: stmtTrn['TRNTYPE'],
    fitId: stmtTrn['FITID'],
    date: dayFromDate(transactionDate),
    name: stmtTrn['NAME'],
    memo: stmtTrn['MEMO'],
  };
}

export default async function parse(ofx: string): Promise<OFXParseResult> {
  // firstly, split into the header attributes and the footer sgml
  const contents = ofx.split('<OFX>', 2);

  // firstly, parse the headers
  const headerString = contents[0].split(/\r?\n/);
  const headers = {};
  headerString.forEach(attrs => {
    if (attrs) {
      const headAttr = attrs.split(/:/, 2);
      headers[headAttr[0]] = headAttr[1];
    }
  });

  // make the SGML and the XML
  const content = `<OFX>${contents[1]}`;

  // Parse the XML/SGML portion of the file into an object
  // Try as XML first, and if that fails do the SGML->XML mangling
  let dataParsed = null;
  try {
    dataParsed = await parseXml(content);
  } catch (e) {
    const sanitized = sgml2Xml(content);
    dataParsed = await parseXml(sanitized);
  }

  return {
    headers: headers,
    transactions: getStmtTrn(dataParsed).map(mapOfxTransaction),
  };
}
