import type {
  BankSyncTransaction,
  EnableBankingTransaction,
} from '#app-enablebanking/services/enablebanking-service';

export type EnableBankingAspsp = {
  name?: string | null;
  country?: string | null;
};

export type IEnableBankingBank = {
  /**
   * Returns whether this bank adapter handles the given ASPSP.
   */
  matches: (aspsp?: EnableBankingAspsp) => boolean;

  /**
   * Normalizes a raw Enable Banking transaction.
   */
  normalizeTransaction: (
    tx: EnableBankingTransaction,
    editedTransaction?: Partial<EnableBankingTransaction>,
  ) => BankSyncTransaction;
};
