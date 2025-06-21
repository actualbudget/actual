export interface YFull {
  masterCategories: MasterCategory[];
  payees: Payee[];
  monthlyBudgets: MonthlyBudget[];
  fileMetaData: FileMetaData;
  transactions: Transaction[];
  scheduledTransactions: ScheduledTransaction[];
  // accountMappings: [];
  budgetMetaData: BudgetMetaData;
  accounts: Account[];
}

export interface MasterCategory {
  entityType: string;
  expanded: boolean;
  note?: string;
  name: string;
  type: string;
  deleteable: boolean;
  subCategories?: SubCategory[];
  entityVersion: string;
  entityId: string;
  sortableIndex: number;

  // speculative
  isTombstone?: boolean;
}

export interface SubCategory {
  entityType: string;
  name: string;
  note?: string;
  type: string;
  // cachedBalance: null;
  masterCategoryId: string;
  entityVersion: string;
  entityId: string;
  sortableIndex: number;

  // speculative
  isTombstone?: boolean;
}

export interface Payee {
  entityType: string;
  autoFillCategoryId?: string;
  autoFillAmount: number;
  name: string;
  renameConditions?: RenameCondition[];
  autoFillMemo?: string;
  targetAccountId?: string;
  // locations: null;
  enabled: boolean;
  entityVersion: string;
  entityId: string;

  // speculative
  isTombstone?: boolean;
}

export interface RenameCondition {
  entityType: string;
  parentPayeeId: string;
  operator: string;
  operand: string;
  entityVersion: string;
  entityId: string;
}

export interface MonthlyBudget {
  entityType: string;
  monthlySubCategoryBudgets: MonthlySubCategoryBudget[];
  month: string;
  entityVersion: string;
  entityId: string;
}

export interface MonthlySubCategoryBudget {
  entityType: string;
  categoryId: string;
  budgeted: number;
  overspendingHandling?: string | undefined | null;
  entityVersion: string;
  entityId: string;
  parentMonthlyBudgetId: string;

  // speculative
  isTombstone?: boolean;
}

export interface FileMetaData {
  entityType: string;
  budgetDataVersion: string;
  currentKnowledge: string;
}

export interface Transaction {
  entityType: string;
  entityId: string;
  categoryId: string;
  payeeId: string;
  amount: number;
  date: string;
  accountId: string;
  entityVersion: string;
  cleared: string;
  accepted: boolean;
  isTombstone?: boolean;
  memo?: string;
  dateEnteredFromSchedule?: string;
  // speculative:
  subTransactions?: SubTransaction[];
  transferTransactionId?: string;
  targetAccountId?: string;
}

// speculative, not in the test data
export type SubTransaction = Omit<Transaction, 'subTransactions'>;

export interface ScheduledTransaction {
  entityType: string;
  entityId: string;
  categoryId: string;
  payeeId: string;
  amount: number;
  date: string;
  isTombstone?: boolean;
  accountId: string;
  entityVersion: string;
  memo: string;
  twiceAMonthStartDay: number;
  cleared: string;
  frequency: string;
  accepted: boolean;
}

export interface BudgetMetaData {
  entityType: string;
  strictBudget: string;
  currencyISOSymbol?: string;
  entityVersion: string;
  currencyLocale: string;
  budgetType: string;
  dateLocale: string;
  entityId: string;
}

export interface Account {
  entityType: string;
  // lastReconciledDate: null;
  lastEnteredCheckNumber: number;
  lastReconciledBalance: number;
  accountType: string;
  hidden: boolean;
  sortableIndex: number;
  onBudget: boolean;
  accountName: string;
  entityVersion: string;
  entityId: string;

  // speculative
  isTombstone?: boolean;
}
