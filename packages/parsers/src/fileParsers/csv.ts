import { default as parser } from 'csv-parse/lib/sync';
import { CSVParserOptions, ParsingError, Transaction } from '../types';

const parseTransactionAmount = (entry: Record<string, string>, options: CSVParserOptions) => {
  if (options.singleAmountField) return entry[options.headings.amount];

  const isDeposit = entry[options.headings.deposit] !== '';
  return isDeposit ? entry[options.headings.deposit] : `-${entry[options.headings.payment]}`;
};

export async function parseCSV(
  fileContents: Buffer,
  options: CSVParserOptions
): Promise<{ errors: ParsingError[]; transactions: Transaction[] }> {
  try {
    const data = parser(fileContents, {
      columns: true,
      bom: true,
      delimiter: options.delimiter,
      quote: '"',
      trim: true,
      relax_column_count: true,
    });

    const transactions: Transaction[] = data.map((entry) => ({
      amount: parseTransactionAmount(entry, options),
      date: entry[options.headings.date],
      payee_name: entry[options.headings.payee_name],
      imported_payee: entry[options.headings.imported_payee],
      notes: entry[options.headings.notes] ?? null,
    }));

    return { errors: [], transactions };
  } catch (err) {
    const errors = [
      {
        message: 'Failed parsing: ' + err.message,
        internal: err.message,
      },
    ];

    return { errors, transactions: [] };
  }
}
