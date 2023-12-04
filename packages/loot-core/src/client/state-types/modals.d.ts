import { type File } from '../../types/file';
import type { AccountEntity, GoCardlessToken } from '../../types/models';
import type { RuleEntity } from '../../types/models/rule';
import type { EmptyObject, StripNever } from '../../types/util';
import type * as constants from '../constants';

export type ModalType = keyof FinanceModals;

type Modal<K extends keyof FinanceModals> = {
  name: K;
  options: FinanceModals[K];
};

// There is a separate (overlapping!) set of modals for the management app. Fun!
export type FinanceModals = {
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
  };

  'confirm-category-delete': { onDelete: () => void } & (
    | { category: string }
    | { group: string }
  );

  'confirm-transaction-edit': {
    onConfirm: () => void;
    confirmReason: string;
  };

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
    onMoveExternal: () => Promise<{ error: unknown; data: unknown }>;
    onClose?: () => void;
    onSuccess: (data: unknown) => Promise<void>;
  };

  'gocardless-init': {
    onSuccess: () => void;
  };
  'gocardless-external-msg': {
    onMoveExternal: (arg: { institutionId: string }) => Promise<{
      error?: 'unauthorized' | 'failed' | 'unknown' | 'timeout';
      data?: GoCardlessToken;
    }>;
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
  };

  'new-category': {
    onValidate?: (value: string) => string[];
    onSubmit: (value: string) => void;
  };

  'new-category-group': {
    onValidate?: (value: string) => string[];
    onSubmit: (value: string) => void;
  };

  'schedule-edit': { id: string } | null;

  'schedule-link': { transactionIds: string[] } | null;

  'schedules-discover': null;

  'schedule-posts-offline-notification': null;
  'switch-budget-type': { onSwitch: () => void };

  'rollover-budget-summary': {
    month: string;
    onBudgetAction: (
      idx: string | number,
      action: string,
      arg: unknown,
    ) => void;
  };

  'report-budget-summary': {
    month: string;
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

export type ModalsActions =
  | PushModalAction
  | ReplaceModalAction
  | PopModalAction
  | CloseModalAction;

export type ModalsState = {
  modalStack: Modal[];
  isHidden: boolean;
};
