import { type File } from '../../types/file';
import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  GoCardlessToken,
  ScheduleEntity,
  TransactionEntity,
} from '../../types/models';
import type { NewRuleEntity, RuleEntity } from '../../types/models/rule';
import type { EmptyObject, StripNever } from '../../types/util';
import type * as constants from '../constants';
export type ModalType = keyof FinanceModals;

export type OptionlessModal = {
  [K in ModalType]: EmptyObject extends FinanceModals[K] ? K : never;
}[ModalType];

export type ModalWithOptions = StripNever<{
  [K in ModalType]: keyof FinanceModals[K] extends never
    ? never
    : FinanceModals[K];
}>;

// There is a separate (overlapping!) set of modals for the management app. Fun!
type FinanceModals = {
  'import-transactions': {
    accountId: string;
    filename: string;
    onImported: (didChange: boolean) => void;
  };

  'add-account': EmptyObject;
  'add-local-account': EmptyObject;
  'close-account': {
    account: AccountEntity;
    balance: number;
    canDelete: boolean;
  };
  'select-linked-accounts': {
    accounts: unknown[];
    requisitionId?: string;
    upgradingAccountId?: string;
    syncSource?: AccountSyncSource;
  };

  'confirm-category-delete': { onDelete: (categoryId: string) => void } & (
    | { category: string }
    | { group: string }
  );

  'load-backup': EmptyObject;

  'manage-rules': { payeeId?: string };
  'edit-rule': {
    rule: RuleEntity | NewRuleEntity;
    onSave?: (rule: RuleEntity) => void;
  };
  'merge-unused-payees': {
    payeeIds: string[];
    targetPayeeId: string;
  };

  'gocardless-init': {
    onSuccess: () => void;
  };
  'simplefin-init': {
    onSuccess: () => void;
  };

  'gocardless-external-msg': {
    onMoveExternal: (arg: {
      institutionId: string;
    }) => Promise<{ error: string } | { data: unknown }>;
    onClose?: () => void;
    onSuccess: (data: GoCardlessToken) => Promise<void>;
  };

  'delete-budget': { file: File };

  'duplicate-budget': {
    /** The budget file to be duplicated */
    file: File;
    /**
     * Indicates whether the duplication is initiated from the budget
     * management page. This may affect the behavior or UI of the
     * duplication process.
     */
    managePage?: boolean;
    /**
     * loadBudget indicates whether to open the 'original' budget, the
     * new duplicated 'copy' budget, or no budget ('none'). If 'none'
     * duplicate-budget stays on the same page.
     */
    loadBudget?: 'none' | 'original' | 'copy';
    /**
     * onComplete is called when the DuplicateFileModal is closed.
     * @param event the event object will pass back the status of the
     * duplicate process.
     * 'success' if the budget was duplicated.
     * 'failed' if the budget could not be duplicated.  This will also
     * pass an error on the event object.
     * 'canceled' if the DuplicateFileModal was canceled.
     * @returns
     */
    onComplete?: (event: {
      status: 'success' | 'failed' | 'canceled';
      error?: Error;
    }) => void;
  };

  import: null;

  'import-ynab4': null;

  'import-ynab5': null;

  'import-actual': null;

  'out-of-sync-migrations': null;

  'files-settings': null;

  'confirm-change-document-dir': {
    currentBudgetDirectory: string;
    newDirectory: string;
  };

  'create-encryption-key': { recreate?: boolean };
  'fix-encryption-key': {
    hasExistingKey?: boolean;
    cloudFileId?: string;
    onSuccess?: () => void;
  };

  'edit-field': {
    name: keyof Pick<TransactionEntity, 'date' | 'amount' | 'notes'>;
    onSubmit: (
      name: keyof Pick<TransactionEntity, 'date' | 'amount' | 'notes'>,
      value: string | number,
      mode?: 'prepend' | 'append' | 'replace' | null,
    ) => void;
    onClose?: () => void;
  };

  'category-autocomplete': {
    categoryGroups?: CategoryGroupEntity[];
    onSelect: (categoryId: string, categoryName: string) => void;
    month?: string;
    showHiddenCategories?: boolean;
    onClose?: () => void;
  };

  'account-autocomplete': {
    onSelect: (accountId: string, accountName: string) => void;
    includeClosedAccounts?: boolean;
    onClose?: () => void;
  };

  'payee-autocomplete': {
    onSelect: (payeeId: string) => void;
    onClose?: () => void;
  };

  'budget-summary': {
    month: string;
  };

  'schedule-edit': { id: string; transaction?: TransactionEntity } | null;

  'schedule-link': {
    transactionIds: string[];
    getTransaction: (
      transactionId: TransactionEntity['id'],
    ) => TransactionEntity;
    accountName?: string;
    onScheduleLinked?: (schedule: ScheduleEntity) => void;
  };

  'schedules-discover': null;

  'schedule-posts-offline-notification': null;
  'account-menu': {
    accountId: string;
    onSave: (account: AccountEntity) => void;
    onCloseAccount: (accountId: string) => void;
    onReopenAccount: (accountId: string) => void;
    onEditNotes: (id: string) => void;
    onClose?: () => void;
  };
  'category-menu': {
    categoryId: string;
    onSave: (category: CategoryEntity) => void;
    onEditNotes: (id: string) => void;
    onDelete: (categoryId: string) => void;
    onToggleVisibility: (categoryId: string) => void;
    onBudgetAction: (month: string, action: string, args?: unknown) => void;
    onClose?: () => void;
  };
  'envelope-budget-menu': {
    categoryId: string;
    month: string;
    onUpdateBudget: (amount: number) => void;
    onCopyLastMonthAverage: () => void;
    onSetMonthsAverage: (numberOfMonths: number) => void;
    onApplyBudgetTemplate: () => void;
  };
  'tracking-budget-menu': {
    categoryId: string;
    month: string;
    onUpdateBudget: (amount: number) => void;
    onCopyLastMonthAverage: () => void;
    onSetMonthsAverage: (numberOfMonths: number) => void;
    onApplyBudgetTemplate: () => void;
  };
  'category-group-menu': {
    groupId: string;
    onSave: (group: CategoryGroupEntity) => void;
    onAddCategory: (groupId: string, isIncome: boolean) => void;
    onEditNotes: (id: string) => void;
    onDelete: (groupId: string) => void;
    onToggleVisibility: (groupId: string) => void;
    onClose?: () => void;
  };
  notes: {
    id: string;
    name: string;
    onSave: (id: string, notes: string) => void;
  };
  'tracking-budget-summary': { month: string };
  'envelope-budget-summary': {
    month: string;
    onBudgetAction: (
      month: string,
      type: string,
      args: unknown,
    ) => Promise<void>;
  };
  'new-category-group': {
    onValidate?: (value: string) => string;
    onSubmit: (value: string) => Promise<void>;
  };
  'new-category': {
    onValidate?: (value: string) => string;
    onSubmit: (value: string) => Promise<void>;
  };
  'envelope-balance-menu': {
    categoryId: string;
    month: string;
    onCarryover: (carryover: boolean) => void;
    onTransfer: () => void;
    onCover: () => void;
  };
  'envelope-summary-to-budget-menu': {
    month: string;
    onTransfer: () => void;
    onCover: () => void;
    onHoldBuffer: () => void;
    onResetHoldBuffer: () => void;
  };
  'tracking-balance-menu': {
    categoryId: string;
    month: string;
    onCarryover: (carryover: boolean) => void;
  };
  transfer: {
    title: string;
    categoryId?: CategoryEntity['id'];
    month: string;
    amount: number;
    onSubmit: (amount: number, toCategoryId: string) => void;
    showToBeBudgeted?: boolean;
  };
  cover: {
    title: string;
    categoryId?: CategoryEntity['id'];
    month: string;
    showToBeBudgeted?: boolean;
    onSubmit: (fromCategoryId: string) => void;
  };
  'hold-buffer': {
    month: string;
    onSubmit: (amount: number) => void;
  };
  'scheduled-transaction-menu': {
    transactionId: string;
    onPost: (transactionId: string) => void;
    onSkip: (transactionId: string) => void;
  };
  'budget-page-menu': {
    onAddCategoryGroup: () => void;
    onToggleHiddenCategories: () => void;
    onSwitchBudgetFile: () => void;
  };
  'envelope-budget-month-menu': {
    month: string;
    onBudgetAction: (month: string, action: string, arg?: unknown) => void;
    onEditNotes: (month: string) => void;
  };
  'tracking-budget-month-menu': {
    month: string;
    onBudgetAction: (month: string, action: string, arg?: unknown) => void;
    onEditNotes: (month: string) => void;
  };
  'budget-list';
  'confirm-transaction-edit': {
    onConfirm: () => void;
    onCancel?: () => void;
    confirmReason: string;
  };
  'confirm-transaction-delete': {
    message?: string;
    onConfirm: () => void;
  };
  'confirm-unlink-account': {
    accountName: string;
    onUnlink: () => void;
  };
  'keyboard-shortcuts': EmptyObject;
  'goal-templates': EmptyObject;
};

export type PushModalAction = {
  type: typeof constants.PUSH_MODAL;
  modal: Modal;
};

export type ReplaceModalAction = {
  type: typeof constants.REPLACE_MODAL;
  modal: Modal;
};

export type PopModalAction = {
  type: typeof constants.POP_MODAL;
};

export type CloseModalAction = {
  type: typeof constants.CLOSE_MODAL;
};

export type CollapseModalsAction = {
  type: typeof constants.COLLAPSE_MODALS;
  rootModalName: string;
};

export type ModalsActions =
  | PushModalAction
  | ReplaceModalAction
  | PopModalAction
  | CloseModalAction
  | CollapseModalsAction;

export type ModalsState = {
  modalStack: Modal[];
  isHidden: boolean;
};

type Modal = {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
};
