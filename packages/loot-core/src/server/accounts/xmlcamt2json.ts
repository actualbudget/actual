// @ts-strict-ignore
import { parseStringPromise } from 'xml2js';

type DateRef = { DtTm: string } | { Dt: string };
type Amt = { _: string };

interface Ntry {
  AcctSvcrRef?: string;
  Amt?: Amt;
  CdtDbtInd: 'CRDT' | 'DBIT';
  ValDt?: DateRef;
  BookgDt?: DateRef;
  NtryDtls?: NtryDtls;
  AddtlNtryInf?: string;
  NtryRef?: string;
}

interface NtryDtls {
  TxDtls: TxDtls | TxDtls[];
}

interface TxDtls {
  RltdPties?: {
    Cdtr: {
      Nm: string;
    };
    Dbtr: {
      Nm: string;
    };
  };
  RmtInf?: {
    Ustrd: string | string[];
  };
}

interface TransactionCAMT {
  amount: number;
  date: string;
  payee_name: string | null;
  imported_payee: string | null;
  notes: string | null;
  imported_id?: string;
}

function findKeys(obj: object, key: string): unknown[] {
  let result = [];
  for (const i in obj) {
    if (!obj.hasOwnProperty(i)) continue;
    if (i === key) {
      if (Array.isArray(obj[i])) {
        result = result.concat(obj[i]);
      } else {
        result.push(obj[i]);
      }
    }
    if (typeof obj[i] === 'object') {
      result = result.concat(findKeys(obj[i], key));
    }
  }
  return result;
}

function getPayeeNameFromTxDtls(
  TxDtls: TxDtls,
  isDebit: boolean,
): string | null {
  if (TxDtls?.RltdPties) {
    const key = isDebit ? TxDtls.RltdPties.Cdtr : TxDtls.RltdPties.Dbtr;
    const Nm = findKeys(key, 'Nm');
    return Nm.length > 0 ? (Nm[0] as string) : null;
  }
  return null;
}

function getNotesFromTxDtls(TxDtls: TxDtls): string | null {
  if (TxDtls?.RmtInf) {
    const Ustrd = TxDtls.RmtInf.Ustrd;
    return Array.isArray(Ustrd) ? Ustrd.join(' ') : Ustrd;
  }
  return null;
}

function convertToNumberOrNull(value: string): number | null {
  const number = Number(value);
  return isNaN(number) ? null : number;
}

function getDtOrDtTm(Date: DateRef | null): string | null {
  if ('DtTm' in Date) {
    return Date.DtTm.slice(0, 10);
  }
  return Date?.Dt;
}

export async function xmlCAMT2json(
  content: string,
): Promise<TransactionCAMT[]> {
  const data = await parseStringPromise(content, { explicitArray: false });
  const entries = findKeys(data, 'Ntry') as Ntry[];

  const transactions: TransactionCAMT[] = [];

  for (const entry of entries) {
    /*
      For (camt.052/054) could filter on entry.Sts= BOOK or PDNG, currently importing all entries
    */

    const id = entry.AcctSvcrRef;

    const amount = convertToNumberOrNull(entry.Amt?._);
    const isDebit = entry.CdtDbtInd === 'DBIT';

    const date = getDtOrDtTm(entry.ValDt) || getDtOrDtTm(entry.BookgDt);

    if (Array.isArray(entry.NtryDtls?.TxDtls)) {
      // we add subtransactions as normal transactions as importing split with subtransactions is not supported
      // amount, and payee_name are not processed correctly for subtransaction.
      entry.NtryDtls.TxDtls.forEach((TxDtls: TxDtls) => {
        const subPayee = getPayeeNameFromTxDtls(TxDtls, isDebit);
        const subNotes = getNotesFromTxDtls(TxDtls);
        const Amt = findKeys(TxDtls, 'Amt') as Amt[];
        const amount = Amt.length > 0 ? convertToNumberOrNull(Amt[0]._) : null;
        transactions.push({
          amount: isDebit ? -amount : amount,
          date,
          payee_name: subPayee,
          imported_payee: subPayee,
          notes: subNotes,
        });
      });
    } else {
      let payee_name: string | null;
      let notes: string | null;
      payee_name = getPayeeNameFromTxDtls(entry.NtryDtls?.TxDtls, isDebit);
      if (!payee_name && entry.AddtlNtryInf) {
        payee_name = entry.AddtlNtryInf;
      }
      notes = getNotesFromTxDtls(entry.NtryDtls?.TxDtls);
      if (!notes && entry.AddtlNtryInf && entry.AddtlNtryInf !== payee_name) {
        notes = entry.AddtlNtryInf;
      }
      if (!payee_name && !notes && entry.NtryRef) {
        notes = entry.NtryRef;
      }
      if (payee_name && notes && payee_name.includes(notes)) {
        notes = null;
      }

      const transaction: TransactionCAMT = {
        amount: isDebit ? -amount : amount,
        date,
        payee_name,
        imported_payee: payee_name,
        notes,
      };
      if (id) {
        transaction.imported_id = id;
      }
      transactions.push(transaction);
    }
  }
  return transactions.filter(
    trans => trans.date != null && trans.amount != null,
  );
}
