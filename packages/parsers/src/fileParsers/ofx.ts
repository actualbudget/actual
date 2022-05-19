import { parse as parseOFX2 } from 'ofx-js';
import { ParsingError, Transaction } from '../types';

export function dayFromDate(date: string): string {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

export async function parseOFX(fileContents: Buffer): Promise<{ errors: ParsingError[]; transactions: Transaction[] }> {
  const errors = [];
  let data;
  try {
    data = await parseOFX2(fileContents.toString());
  } catch (err) {
    errors.push({
      message: 'Failed importing file',
      internal: err.stack,
    });
    return { errors, transactions: [] };
  }

  const rawTransactions = data.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN;
  return {
    errors,
    transactions: rawTransactions.map((trans) => ({
      amount: trans.TRNAMT,
      imported_id: trans.FITID,
      date: trans.DTPOSTED ? dayFromDate(trans.DTPOSTED) : null,
      payee_name: trans.NAME,
      imported_payee: trans.NAME,
      notes: trans.MEMO || null,
    })),
  };
}
