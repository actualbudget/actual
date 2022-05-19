import { Transaction, ParsingError } from '../types';
import { looselyParseAmount } from '../util';

export async function parseQIF(fileContents: Buffer): Promise<{ errors: ParsingError[]; transactions: Transaction[] }> {
  try {
    const { transactions } = parseQIFToJson(fileContents.toString());

    return {
      errors: [],
      transactions: transactions.map((trans) => ({
        amount: trans.amount != null ? looselyParseAmount(trans.amount) : null,
        date: trans.date,
        payee_name: trans.payee,
        imported_payee: trans.payee,
        notes: trans.memo || null,
      })),
    };
  } catch (err) {
    const errors = [
      {
        message: "Failed parsing: doesn't look like a valid QIF file.",
        internal: err.stack,
      },
    ];

    return { errors, transactions: [] };
  }
}

interface QifTransaction {
  date: string;
  amount: string;
  number: string;
  memo: string;
  address: string;
  payee: string;
  category: string;
  clearedStatus: string;
  subcategory: string;
  division: Partial<Division>[];
}

interface Division {
  category: string;
  subcategory: string;
  description: string;
  amount: number;
}

function parseQIFToJson(qif: string): {
  type: string;
  transactions: Partial<QifTransaction>[];
} {
  const lines = qif.split('\n');
  let line = lines.shift();
  const type = /!Type:([^$]*)$/.exec(line.trim());
  const transactions: Partial<QifTransaction>[] = [];
  let transaction: Partial<QifTransaction> = {};

  if (!type || !type.length) {
    throw new Error('File does not appear to be a valid qif file: ' + line);
  }

  let division: Partial<Division> = {};

  while ((line = lines.shift())) {
    line = line.trim();
    // End of transaction
    if (line === '^') {
      transactions.push(transaction);
      transaction = {};
      continue;
    }
    switch (line[0]) {
      case 'D':
        transaction.date = line.substring(1);
        break;
      case 'T':
        transaction.amount = line.substring(1);
        break;
      case 'N':
        transaction.number = line.substring(1);
        break;
      case 'M':
        transaction.memo = line.substring(1);
        break;
      case 'A':
        transaction.address = ((transaction.address as any) || []).concat(line.substring(1));
        break;
      case 'P':
        transaction.payee = line.substring(1).replace(/&amp;/g, '&');
        break;
      case 'L': {
        const lArray = line.substring(1).split(':');
        transaction.category = lArray[0];
        if (lArray[1] !== undefined) {
          transaction.subcategory = lArray[1];
        }
        break;
      }
      case 'C':
        transaction.clearedStatus = line.substring(1);
        break;
      case 'S': {
        const sArray = line.substring(1).split(':');
        division.category = sArray[0];
        if (sArray[1] !== undefined) {
          division.subcategory = sArray[1];
        }
        break;
      }
      case 'E':
        division.description = line.substring(1);
        break;
      case '$':
        division.amount = parseFloat(line.substring(1));
        if (!(transaction.division instanceof Array)) {
          transaction.division = [];
        }
        transaction.division.push(division);
        division = {};

        break;

      default:
        throw new Error('Unknown Detail Code: ' + line[0]);
    }
  }

  if (Object.keys(transaction).length) {
    transactions.push(transaction);
  }

  return {
    type: type[1],
    transactions,
  };
}
