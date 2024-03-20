import { type File } from '../../types/file';
import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  GoCardlessToken,
} from '../../types/models';
import type { RuleEntity } from '../../types/models/rule';
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
    requisitionId: string;
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
    rule: RuleEntity;
    onSave: (rule: RuleEntity) => void;
  };
  'merge-unused-payees': {
    payeeIds: string[];
    targetPayeeId: string;
  };

  'plaid-external-msg': {
    onMoveExternal: () => Promise<void>;
    onClose?: () => void;
    onSuccess: (data: unknown) => Promise<void>;
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

  import: null;

  'import-ynab4': null;

  'import-ynab5': null;

  'import-actual': null;

  'create-encryption-key': { recreate?: boolean };
  'fix-encryption-key': {
    hasExistingKey?: boolean;
    cloudFileId?: string;
    onSuccess?: () => void;
  };

  'edit-field': {
    name: string;
    onSubmit: (name: string, value: string) => void;
    onClose: () => void;
  };

  'category-autocomplete': {
    categoryGroups: CategoryGroupEntity[];
    onSelect: (categoryId: string, categoryName: string) => void;
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

  'schedule-edit': { id: string } | null;

  'schedule-link': { transactionIds: string[] } | null;

  'schedules-discover': null;

  'schedule-posts-offline-notification': null;
  'switch-budget-type': { onSwitch: () => void };
  'category-menu': {
    categoryId: string;
    onSave: (category: CategoryEntity) => void;
    onEditNotes: (id: string) => void;
    onDelete: (categoryId: string) => void;
    onClose?: () => void;
  };
  'category-group-menu': {
    groupId: string;
    onSave: (group: CategoryGroupEntity) => void;
    onAddCategory: (groupId: string, isIncome: boolean) => void;
    onEditNotes: (id: string) => void;
    onDelete: (groupId: string) => void;
    onClose?: () => void;
  };
  notes: {
    id: string;
    name: string;
    onSave: (id: string, notes: string) => void;
  };
  'report-budget-summary': { month: string };
  'rollover-budget-summary': {
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
  'rollover-balance-menu': {
    categoryId: string;
    month: string;
    onCarryover: (carryover: boolean) => void;
    onTransfer: () => void;
    onCover: () => void;
  };
  'rollover-to-budget-menu': {
    month: string;
    onTransfer: () => void;
    onHoldBuffer: () => void;
    onResetHoldBuffer: () => void;
  };
  'report-balance-menu': {
    categoryId: string;
    month: string;
    onCarryover: (carryover: boolean) => void;
  };
  transfer: {
    title: string;
    amount: number;
    onSubmit: (amount: number, toCategoryId: string) => void;
    showToBeBudgeted?: boolean;
  };
  cover: {
    categoryId: string;
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
