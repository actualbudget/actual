// Source: https://api.ynab.com/papi/open_api_spec.yaml
// Schema refs use #/components/schemas/...

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/BudgetDetail
export type Budget = {
  id: string;
  name: string;
  budget_name?: string;
  last_modified_on?: string;
  first_month?: string;
  last_month?: string;
  date_format?: DateFormat;
  currency_format?: CurrencyFormat;
  accounts: Account[];
  payees: Payee[];
  payee_locations: PayeeLocation[];
  category_groups: CategoryGroup[];
  categories: Category[];
  months: MonthDetail[];
  transactions: Transaction[];
  subtransactions: Subtransaction[];
  scheduled_transactions: ScheduledTransaction[];
  scheduled_subtransactions: ScheduledSubtransaction[];
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/DateFormat
// Description: The date format setting for the budget. In some cases the format will
// not be available and will be specified as null.
export type DateFormat =
  | 'YYYY/MM/DD'
  | 'YYYY-MM-DD'
  | 'DD-MM-YYYY'
  | 'DD/MM/YYYY'
  | 'DD.MM.YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY.MM.DD'
  | null;

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/CurrencyFormat
// Description: The currency format setting for the budget. In some cases the format will
// not be available and will be specified as null.
export type CurrencyFormat = {
  iso_code: string;
  example_format: string;
  decimal_digits: number;
  decimal_separator: string;
  symbol_first: boolean;
  group_separator: string;
  currency_symbol: string;
  display_symbol: boolean;
} | null;

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/Account
export type Account = {
  id: string;
  name: string;
  type: AccountType;
  on_budget: boolean;
  closed: boolean;
  note?: string | null;
  balance: number;
  cleared_balance: number;
  uncleared_balance: number;
  transfer_payee_id: string | null;
  direct_import_linked?: boolean;
  direct_import_in_error?: boolean;
  last_reconciled_at?: string | null;
  debt_original_balance?: number | null;
  debt_interest_rates?: LoanAccountPeriodicValue | null;
  debt_minimum_payments?: LoanAccountPeriodicValue | null;
  debt_escrow_amounts?: LoanAccountPeriodicValue | null;
  deleted: boolean;
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/LoanAccountPeriodicValue
export type LoanAccountPeriodicValue = Record<string, number> | null;

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/AccountType
// Description: The type of account.
export type AccountType =
  | 'checking'
  | 'savings'
  | 'cash'
  | 'creditCard'
  | 'lineOfCredit'
  | 'otherAsset'
  | 'otherLiability'
  | 'mortgage'
  | 'autoLoan'
  | 'studentLoan'
  | 'personalLoan'
  | 'medicalDebt'
  | 'otherDebt';

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/Payee
export type Payee = {
  id: string;
  name: string;
  transfer_account_id?: string | null;
  deleted: boolean;
  transfer_acct?: string;
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/PayeeLocation
export type PayeeLocation = {
  id: string;
  payee_id: string;
  latitude: string;
  longitude: string;
  deleted: boolean;
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/CategoryGroup
export type CategoryGroup = {
  id: string;
  name: string;
  deleted: boolean;
  hidden: boolean;
  note?: string;
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/Category
export type Category = {
  id: string;
  category_group_id: string;
  category_group_name?: string;
  name: string;
  deleted: boolean;
  hidden: boolean;
  original_category_group_id?: string | null;
  note?: string;
  budgeted: number;
  activity: number;
  balance: number;
  goal_type?: GoalType | null;
  goal_needs_whole_amount?: boolean | null;
  goal_day?: number | null;
  goal_cadence?: number | null;
  goal_cadence_frequency?: number | null;
  goal_creation_month?: string | null;
  goal_target?: number | null;
  goal_target_month?: string | null;
  goal_percentage_complete?: number | null;
  goal_months_to_budget?: number | null;
  goal_under_funded?: number | null;
  goal_overall_funded?: number | null;
  goal_overall_left?: number | null;
  goal_snoozed_at?: string | null;
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/Category
// Description: The type of goal, if the category has a goal.
// (TB='Target Category Balance', TBD='Target Category Balance by Date', MF='Monthly
// Funding', NEED='Plan Your Spending')
export type GoalType = 'TB' | 'TBD' | 'MF' | 'NEED' | 'DEBT';

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/TransactionSummary
export type Transaction = {
  id: string;
  date: string;
  amount: number;
  memo?: string | null;
  cleared: TransactionClearedStatus;
  approved: boolean;
  flag_color?: TransactionFlagColor | null;
  flag_name?: TransactionFlagName | null;
  account_id: string;
  payee_id?: string | null;
  category_id?: string | null;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  matched_transaction_id?: string | null;
  import_id?: string | null;
  import_payee_name?: string | null;
  import_payee_name_original?: string | null;
  debt_transaction_type?: DebtTransactionType | null;
  deleted: boolean;
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/TransactionClearedStatus
// Description: The cleared status of the transaction.
export type TransactionClearedStatus = 'cleared' | 'uncleared' | 'reconciled';

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/TransactionFlagColor
// Description: The transaction flag.
export type TransactionFlagColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | ''
  | null;

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/TransactionFlagName
// Description: The customized name of a transaction flag.
export type TransactionFlagName = string | null;

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/TransactionSummary
// Description: If the transaction is a debt/loan account transaction, the type of transaction
export type DebtTransactionType =
  | 'payment'
  | 'refund'
  | 'fee'
  | 'interest'
  | 'escrow'
  | 'balanceAdjustment'
  | 'credit'
  | 'charge';

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/SubTransaction
export type Subtransaction = {
  id: string;
  transaction_id: string;
  amount: number;
  memo?: string | null;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  deleted: boolean;
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/ScheduledTransactionSummary
export type ScheduledTransaction = {
  id: string;
  date_first: string;
  date_next: string;
  frequency: ScheduledTransactionFrequency;
  amount: number;
  memo?: string | null;
  flag_color?: TransactionFlagColor | null;
  flag_name?: TransactionFlagName | null;
  account_id: string;
  payee_id?: string | null;
  category_id?: string | null;
  transfer_account_id?: string | null;
  deleted: boolean;
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/ScheduledSubTransaction
export type ScheduledSubtransaction = {
  id: string;
  scheduled_transaction_id: string;
  amount: number;
  memo?: string | null;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  transfer_account_id?: string | null;
  deleted: boolean;
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/ScheduledTransactionFrequency
// Description: The scheduled transaction frequency.
export type ScheduledTransactionFrequency =
  | 'never'
  | 'daily'
  | 'weekly'
  | 'everyOtherWeek'
  | 'twiceAMonth'
  | 'every4Weeks'
  | 'monthly'
  | 'everyOtherMonth'
  | 'every3Months'
  | 'every4Months'
  | 'twiceAYear'
  | 'yearly'
  | 'everyOtherYear';

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/MonthSummary
export type MonthSummary = {
  month: string;
  note?: string | null;
  income: number;
  budgeted: number;
  activity: number;
  to_be_budgeted: number;
  age_of_money?: number | null;
  deleted: boolean;
};

// Source: https://api.ynab.com/papi/open_api_spec.yaml#/components/schemas/MonthDetail
export type MonthDetail = MonthSummary & {
  categories: Category[];
};
