export type Budget = {
  name?: string;
  budget_name?: string;
  accounts: Account[];
  payees: Payee[];
  category_groups: CategoryGroup[];
  categories: Category[];
  transactions: Transaction[];
  subtransactions: Subtransaction[];
  months: Month[];
  payee_locations?: PayeeLocation[];
};

export type Account = {
  id: string;
  name: string;
  on_budget: boolean;
  deleted: boolean;
  closed: boolean;
};

export type Payee = {
  id: string;
  name: string;
  deleted: boolean;
  transfer_acct?: string;
};

export type PayeeLocation = {
  id: string;
  payee_id: string;
  latitude: string;
  longitude: string;
  deleted: boolean;
};

export type CategoryGroup = {
  id: string;
  name: string;
  deleted: boolean;
  hidden: boolean;
  note?: string;
};

export type Category = {
  id: string;
  category_group_id: string;
  name: string;
  deleted: boolean;
  hidden: boolean;
  note?: string;
};

export type Transaction = {
  id: string;
  account_id: string;
  date: string;
  payee_id: string;
  import_id: string;
  category_id: string;
  transfer_account_id: string;
  transfer_transaction_id: string;
  memo: string;
  cleared: string;
  amount: number;
  deleted: boolean;
};

export type Subtransaction = {
  id: string;
  transaction_id: string;
  category_id: string;
  memo: string;
  amount: number;
  transfer_account_id: string;
  payee_id: string;
};

export type Month = {
  month: string;
  categories: MonthCategory[];
};

export type MonthCategory = {
  category_group_id: string;
  id: string;
  budgeted: number;
};
