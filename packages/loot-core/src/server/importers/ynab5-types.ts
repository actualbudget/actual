export interface Budget {
  name?: string;
  budget_name?: string;
  accounts: Account[];
  payees: Payee[];
  category_groups: CategoryGroup[];
  categories: Category[];
  transactions: Transaction[];
  subtransactions: Subtransaction[];
  months: Month[];
}

export interface Account {
  id: string;
  name: string;
  on_budget: boolean;
  deleted: boolean;
  closed: boolean;
}

export interface Payee {
  id: string;
  name: string;
  deleted: boolean;
  transfer_acct?: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  deleted: boolean;
  hidden: boolean;
  note?: string;
}

export interface Category {
  id: string;
  category_group_id: string;
  name: string;
  deleted: boolean;
  hidden: boolean;
  note?: string;
}

export interface Transaction {
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
}

export interface Subtransaction {
  id: string;
  transaction_id: string;
  category_id: string;
  memo: string;
  amount: number;
  transfer_account_id: string;
  payee_id: string;
}

export interface Month {
  month: string;
  categories: MonthCategory[];
}

export interface MonthCategory {
  category_group_id: string;
  id: string;
  budgeted: number;
}
