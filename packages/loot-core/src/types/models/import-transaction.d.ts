/**
 * Represents a transaction object specifically for import operations.
 * This type is used when importing transactions from external sources.
 */
export interface ImportTransactionEntity {
  /** Required. The ID of the account this transaction belongs to */
  account: string;

  /** Required. Transaction date in YYYY-MM-DD format */
  date: string;

  /** A currency amount as an integer representing the value without decimal places.
   * For example, USD amount of $120.30 would be 12030 */
  amount?: number;

  /** In a create/import request, this overrides payee_name.
   * Should be an existing payee ID */
  payee?: string;

  /** If given, a payee will be created with this name.
   * If this matches an already existing payee, that payee will be used.
   * Only available in create/import requests */
  payee_name?: string;

  /** This can be anything. Meant to represent the raw description when importing,
   * allowing the user to see the original value */
  imported_payee?: string;

  /** The ID of the category to assign to this transaction */
  category?: string;

  /** Any additional notes for the transaction */
  notes?: string;

  /** A unique id usually given by the bank, if importing.
   * Use this to avoid duplicate transactions */
  imported_id?: string;

  /** If a transfer, the id of the corresponding transaction in the other account.
   * You should not change this for existing transfers.
   * Only set this when importing */
  transfer_id?: string;

  /** A flag indicating if the transaction has cleared or not */
  cleared?: boolean;

  /** An array of subtransactions for a split transaction.
   * Only available in get or create/import requests.
   * If amounts don't equal total amount, API call will succeed but error will show in app */
  subtransactions?: Array<{
    /** The only required field for subtransactions */
    amount: number;
    category?: string;
    notes?: string;
  }>;
}
