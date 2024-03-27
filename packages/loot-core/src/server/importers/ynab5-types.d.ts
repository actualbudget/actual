/* eslint-disable import/no-unused-modules */

export namespace YNAB5 {
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

  interface Account {
    id: string;
    name: string;
    on_budget: boolean;
    deleted: boolean;
    closed: boolean;
  }

  interface Payee {
    id: string;
    name: string;
    deleted: boolean;
    transfer_acct?: string;
  }

  interface CategoryGroup {
    id: string;
    name: string;
    deleted: boolean;
  }

  interface Category {
    id: string;
    category_group_id: string;
    name: string;
    deleted: boolean;
  }

  interface Transaction {
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

  interface Subtransaction {
    id: string;
    transaction_id: string;
    category_id: string;
    memo: string;
    amount: number;
    transfer_account_id: string;
    payee_id: string;
  }

  interface Month {
    month: string;
    categories: MonthCategory[];
  }

  interface MonthCategory {
    category_group_id: string;
    id: string;
    budgeted: number;
  }
}
