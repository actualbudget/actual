declare module 'mt940js' {
  export type Mt940Transaction = {
    date: Date;
    entryDate: Date | '';
    fundsCode: string;
    amount: number;
    isReversal: boolean;
    transactionType: string;
    /** Customer reference, often the literal `NONREF` when the bank sets none. */
    reference: string;
    /** Bank-assigned reference, unique per entry when present. */
    bankReference: string;
    extraDetails: string;
    currency: string;
    /** Raw `:86:` field. */
    details: string;
    /** Parsed `:86:` subtags, only present when the field is structured. */
    structuredDetails?: Record<string, string>;
  };

  export type Mt940Statement = {
    transactionReference: string;
    accountIdentification: string;
    currency: string;
    openingBalance: number;
    closingBalance: number;
    transactions: Mt940Transaction[];
  };

  export class Parser {
    parse(input: string): Mt940Statement[];
  }
}
