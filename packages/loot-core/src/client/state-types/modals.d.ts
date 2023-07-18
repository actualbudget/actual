import type { AccountEntity } from '../../types/models';
import type { RuleEntity } from '../../types/models/rule';
import type * as constants from '../constants';

type Modal = {
  [K in keyof FinanceModals]: {
    name: K;
    options: FinanceModals[K];
  };
}[keyof FinanceModals];

// There is a separate (overlapping!) set of modals for the management app. Fun!
type FinanceModals = {
  'import-transactions': {
    accountId: string;
    filename: string;
    onImported: (didChange: boolean) => void;
  };

  'add-account': null;
  'add-local-account': null;
  'close-account': {
    account: AccountEntity;
    balance: number;
    canDelete: boolean;
  };
  'select-linked-accounts': {
    accounts: unknown[];
    requisitionId: string;
    upgradingAccountId: string;
  };
  'configure-linked-accounts': never;

  'confirm-category-delete': { onDelete: () => void } & (
    | { category: string }
    | { group: string }
  );

  'load-backup': null;

  'manage-rules': { payeeId: string } | null;
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
  'gocardless-external-msg': {
    onMoveExternal: (arg: {
      institutionId: string;
    }) => Promise<{ error: string } | { data: unknown }>;
    onClose?: () => void;
    onSuccess: (data: unknown) => Promise<void>;
  };

  'create-encryption-key': { recreate: boolean } | null;
  'fix-encryption-key': {
    hasExistingKey: boolean;
    cloudFileId: string;
    onSuccess?: () => void;
  };

  'edit-field': {
    name: string;
    onSubmit: (name: string, value: string) => void;
  };

  'budget-summary': {
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
