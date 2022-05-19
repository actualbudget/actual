export type Transaction = {
  amount: number | null;
  date: string;
  payee_name: string;
  imported_payee: string;
  notes: string | null;
};

export type ParserOptions = CSVParserOptions | undefined;

export type CSVParserOptions = {
  delimiter: string;
  singleAmountField: boolean;
  headings: Record<keyof Omit<Transaction, 'amount'>, string> & { amount?: string; deposit?: string; payment?: string };
};

export type ParsingError = {
  message: string;
  internal: string;
};
