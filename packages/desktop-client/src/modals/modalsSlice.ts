import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { send } from 'loot-core/platform/client/fetch';
import { type File } from 'loot-core/types/file';
import {
  type AccountEntity,
  type AccountSyncSource,
  type CategoryEntity,
  type CategoryGroupEntity,
  type GoCardlessToken,
  type NewRuleEntity,
  type RuleEntity,
  type ScheduleEntity,
  type TransactionEntity,
  type UserEntity,
  type UserAccessEntity,
  type NewUserEntity,
  type NoteEntity,
} from 'loot-core/types/models';

import { resetApp, setAppState } from '@desktop-client/app/appSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';
import { signOut } from '@desktop-client/users/usersSlice';

const sliceName = 'modals';

export type Modal =
  | {
      name: 'import-transactions';
      options: {
        accountId: string;
        filename: string;
        categories?: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
        onImported: (didChange: boolean) => void;
      };
    }
  | {
      name: 'add-account';
      options: {
        upgradingAccountId?: string;
      };
    }
  | {
      name: 'add-local-account';
    }
  | {
      name: 'close-account';
      options: {
        account: AccountEntity;
        balance: number;
        canDelete: boolean;
      };
    }
  | {
      name: 'select-linked-accounts';
      options: {
        externalAccounts: unknown[];
        requisitionId?: string;
        upgradingAccountId?: string | undefined;
        syncSource?: AccountSyncSource;
      };
    }
  | {
      name: 'confirm-category-delete';
      options: {
        onDelete: (transferCategoryId: CategoryEntity['id']) => void;
        category?: CategoryEntity['id'];
        group?: CategoryGroupEntity['id'];
      };
    }
  | {
      name: 'load-backup';
      options: {
        budgetId?: string;
        watchUpdates?: boolean;
        backupDisabled?: boolean;
      };
    }
  | {
      name: 'manage-rules';
      options: { payeeId?: string };
    }
  | {
      name: 'edit-rule';
      options: {
        rule: RuleEntity | NewRuleEntity;
        onSave?: (rule: RuleEntity) => void;
      };
    }
  | {
      name: 'merge-unused-payees';
      options: {
        payeeIds: string[];
        targetPayeeId: string;
      };
    }
  | {
      name: 'gocardless-init';
      options: {
        onSuccess: () => void;
      };
    }
  | {
      name: 'simplefin-init';
      options: {
        onSuccess: () => void;
      };
    }
  | {
      name: 'pluggyai-init';
      options: {
        onSuccess: () => void;
      };
    }
  | {
      name: 'gocardless-external-msg';
      options: {
        onMoveExternal: (arg: {
          institutionId: string;
        }) => Promise<
          | { error: 'timeout' }
          | { error: 'unknown'; message?: string }
          | { data: GoCardlessToken }
        >;
        onClose?: (() => void) | undefined;
        onSuccess: (data: GoCardlessToken) => Promise<void>;
      };
    }
  | {
      name: 'delete-budget';
      options: { file: File };
    }
  | {
      name: 'duplicate-budget';
      options: {
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
    }
  | {
      name: 'import';
    }
  | {
      name: 'import-ynab4';
    }
  | {
      name: 'import-ynab5';
    }
  | {
      name: 'import-actual';
    }
  | {
      name: 'out-of-sync-migrations';
    }
  | {
      name: 'files-settings';
    }
  | {
      name: 'confirm-change-document-dir';
      options: {
        currentBudgetDirectory: string;
        newDirectory: string;
      };
    }
  | {
      name: 'create-encryption-key';
      options: { recreate?: boolean };
    }
  | {
      name: 'fix-encryption-key';
      options: {
        hasExistingKey?: boolean;
        cloudFileId?: string;
        onSuccess?: () => void;
      };
    }
  | {
      name: 'edit-field';
      options: {
        name: keyof Pick<TransactionEntity, 'date' | 'amount' | 'notes'>;
        onSubmit: (
          name: keyof Pick<TransactionEntity, 'date' | 'amount' | 'notes'>,
          value: string | number,
          mode?: 'prepend' | 'append' | 'replace' | null,
        ) => void;
        onClose?: () => void;
      };
    }
  | {
      name: 'category-autocomplete';
      options: {
        title?: string;
        categoryGroups?: CategoryGroupEntity[];
        onSelect: (categoryId: string, categoryName: string) => void;
        month?: string | undefined;
        showHiddenCategories?: boolean;
        closeOnSelect?: boolean;
        clearOnSelect?: boolean;
        onClose?: () => void;
      };
    }
  | {
      name: 'account-autocomplete';
      options: {
        onSelect: (accountId: string, accountName: string) => void;
        includeClosedAccounts?: boolean;
        onClose?: () => void;
      };
    }
  | {
      name: 'payee-autocomplete';
      options: {
        onSelect: (payeeId: string) => void;
        onClose?: () => void;
      };
    }
  | {
      name: 'budget-summary';
      options: {
        month: string;
      };
    }
  | {
      name: 'schedule-edit';
      options: { id?: string; transaction?: TransactionEntity } | null;
    }
  | {
      name: 'schedule-link';
      options: {
        transactionIds: string[];
        getTransaction: (
          transactionId: TransactionEntity['id'],
        ) => TransactionEntity;
        accountName?: string;
        onScheduleLinked?: (schedule: ScheduleEntity) => void;
      };
    }
  | {
      name: 'schedules-discover';
    }
  | {
      name: 'schedule-posts-offline-notification';
    }
  | {
      name: 'synced-account-edit';
      options: {
        account: AccountEntity;
      };
    }
  | {
      name: 'account-menu';
      options: {
        accountId: AccountEntity['id'];
        onSave: (account: AccountEntity) => void;
        onCloseAccount: (accountId: AccountEntity['id']) => void;
        onReopenAccount: (accountId: AccountEntity['id']) => void;
        onEditNotes: (id: NoteEntity['id']) => void;
        onClose?: () => void;
        onToggleRunningBalance?: () => void;
      };
    }
  | {
      name: 'category-menu';
      options: {
        categoryId: CategoryEntity['id'];
        onSave: (category: CategoryEntity) => void;
        onEditNotes: (id: NoteEntity['id']) => void;
        onDelete: (categoryId: CategoryEntity['id']) => void;
        onToggleVisibility: (categoryId: CategoryEntity['id']) => void;
        onClose?: () => void;
      };
    }
  | {
      name: 'envelope-budget-menu';
      options: {
        categoryId: CategoryEntity['id'];
        month: string;
        onUpdateBudget: (amount: number) => void;
        onCopyLastMonthAverage: () => void;
        onSetMonthsAverage: (numberOfMonths: number) => void;
        onApplyBudgetTemplate: () => void;
      };
    }
  | {
      name: 'tracking-budget-menu';
      options: {
        categoryId: CategoryEntity['id'];
        month: string;
        onUpdateBudget: (amount: number) => void;
        onCopyLastMonthAverage: () => void;
        onSetMonthsAverage: (numberOfMonths: number) => void;
        onApplyBudgetTemplate: () => void;
      };
    }
  | {
      name: 'category-group-menu';
      options: {
        groupId: CategoryGroupEntity['id'];
        onSave: (group: CategoryGroupEntity) => void;
        onAddCategory: (
          groupId: CategoryGroupEntity['id'],
          isIncome: CategoryGroupEntity['is_income'],
        ) => void;
        onEditNotes: (id: NoteEntity['id']) => void;
        onDelete: (groupId: CategoryGroupEntity['id']) => void;
        onToggleVisibility: (groupId: CategoryGroupEntity['id']) => void;
        onClose?: () => void;
      };
    }
  | {
      name: 'notes';
      options: {
        id: NoteEntity['id'];
        name: string;
        onSave: (id: NoteEntity['id'], contents: string) => void;
      };
    }
  | {
      name: 'tracking-budget-summary';
      options: { month: string };
    }
  | {
      name: 'envelope-budget-summary';
      options: {
        month: string;
        onBudgetAction: (
          month: string,
          type: string,
          args?: unknown,
        ) => Promise<void>;
      };
    }
  | {
      name: 'new-category-group';
      options: {
        onValidate?: (value: string) => string | null;
        onSubmit: (value: string) => Promise<void>;
      };
    }
  | {
      name: 'new-category';
      options: {
        onValidate?: (value: string) => string | null;
        onSubmit: (value: string) => Promise<void>;
      };
    }
  | {
      name: 'envelope-balance-menu';
      options: {
        categoryId: CategoryEntity['id'];
        month: string;
        onCarryover?: (carryover: boolean) => void;
        onTransfer?: () => void;
        onCover?: () => void;
      };
    }
  | {
      name: 'envelope-income-balance-menu';
      options: {
        categoryId: CategoryEntity['id'];
        month: string;
        onCarryover: (carryover: boolean) => void;
        onShowActivity: () => void;
      };
    }
  | {
      name: 'envelope-summary-to-budget-menu';
      options: {
        month: string;
        onTransfer: () => void;
        onCover: () => void;
        onHoldBuffer: () => void;
        onResetHoldBuffer: () => void;
        onBudgetAction: (month: string, action: string, arg?: unknown) => void;
      };
    }
  | {
      name: 'tracking-balance-menu';
      options: {
        categoryId: CategoryEntity['id'];
        month: string;
        onCarryover: (carryover: boolean) => void;
      };
    }
  | {
      name: 'transfer';
      options: {
        title: string;
        categoryId?: CategoryEntity['id'];
        month: string;
        amount: number;
        onSubmit: (amount: number, toCategoryId: CategoryEntity['id']) => void;
        showToBeBudgeted?: boolean;
      };
    }
  | {
      name: 'cover';
      options: {
        title: string;
        categoryId?: CategoryEntity['id'];
        month: string;
        showToBeBudgeted?: boolean;
        onSubmit: (fromCategoryId: CategoryEntity['id']) => void;
      };
    }
  | {
      name: 'hold-buffer';
      options: {
        month: string;
        onSubmit: (amount: number) => void;
      };
    }
  | {
      name: 'scheduled-transaction-menu';
      options: {
        transactionId: TransactionEntity['id'];
        onPost: (transactionId: TransactionEntity['id']) => void;
        onSkip: (transactionId: TransactionEntity['id']) => void;
        onComplete: (transactionId: TransactionEntity['id']) => void;
      };
    }
  | {
      name: 'budget-page-menu';
      options: {
        onAddCategoryGroup: () => void;
        onToggleHiddenCategories: () => void;
        onSwitchBudgetFile: () => void;
      };
    }
  | {
      name: 'envelope-budget-month-menu';
      options: {
        month: string;
        onBudgetAction: (month: string, action: string, arg?: unknown) => void;
        onEditNotes: (id: NoteEntity['id']) => void;
      };
    }
  | {
      name: 'tracking-budget-month-menu';
      options: {
        month: string;
        onBudgetAction: (month: string, action: string, arg?: unknown) => void;
        onEditNotes: (id: NoteEntity['id']) => void;
      };
    }
  | {
      name: 'budget-file-selection';
    }
  | {
      name: 'confirm-transaction-edit';
      options: {
        onConfirm: () => void;
        onCancel?: () => void;
        confirmReason: string;
      };
    }
  | {
      name: 'confirm-transaction-delete';
      options: {
        message?: string | undefined;
        onConfirm: () => void;
      };
    }
  | {
      name: 'edit-user';
      options: {
        user: UserEntity | NewUserEntity;
        onSave: (user: UserEntity) => void;
      };
    }
  | {
      name: 'edit-access';
      options: {
        access: UserAccessEntity;
        onSave: (userAccess: UserAccessEntity) => void;
      };
    }
  | {
      name: 'transfer-ownership';
      options: {
        onSave: () => void;
      };
    }
  | {
      name: 'enable-openid';
      options: {
        onSave: () => void;
      };
    }
  | {
      name: 'enable-password-auth';
      options: {
        onSave: () => void;
      };
    }
  | {
      name: 'confirm-unlink-account';
      options: {
        accountName: string;
        isViewBankSyncSettings: boolean;
        onUnlink: () => void;
      };
    }
  | {
      name: 'keyboard-shortcuts';
    }
  | {
      name: 'goal-templates';
    }
  | {
      name: 'schedules-upcoming-length';
    }
  | {
      name: 'payee-category-learning';
    }
  | {
      name: 'category-automations-edit';
    };

type OpenAccountCloseModalPayload = {
  accountId: AccountEntity['id'];
};

export const openAccountCloseModal = createAppAsyncThunk(
  `${sliceName}/openAccountCloseModal`,
  async (
    { accountId }: OpenAccountCloseModalPayload,
    { dispatch, getState },
  ) => {
    const {
      balance,
      numTransactions,
    }: { balance: number; numTransactions: number } = await send(
      'account-properties',
      {
        id: accountId,
      },
    );
    const account = getState().queries.accounts.find(
      acct => acct.id === accountId,
    );

    if (!account) {
      throw new Error(`Account with ID ${accountId} does not exist.`);
    }

    dispatch(
      pushModal({
        modal: {
          name: 'close-account',
          options: {
            account,
            balance,
            canDelete: numTransactions === 0,
          },
        },
      }),
    );
  },
);

type ModalsState = {
  modalStack: Modal[];
  isHidden: boolean;
};

const initialState: ModalsState = {
  modalStack: [],
  isHidden: false,
};

type PushModalPayload = {
  modal: Modal;
};

type ReplaceModalPayload = {
  modal: Modal;
};

type CollapseModalPayload = {
  rootModalName: Modal['name'];
};

const modalsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    pushModal(state, action: PayloadAction<PushModalPayload>) {
      const modal = action.payload.modal;
      // special case: don't show the keyboard shortcuts modal if there's already a modal open
      if (
        modal.name.endsWith('keyboard-shortcuts') &&
        (state.modalStack.length > 0 ||
          window.document.querySelector(
            'div[data-testid="filters-menu-tooltip"]',
          ) !== null)
      ) {
        return state;
      }
      state.modalStack = [...state.modalStack, modal];
    },
    replaceModal(state, action: PayloadAction<ReplaceModalPayload>) {
      const modal = action.payload.modal;
      state.modalStack = [modal];
    },
    popModal(state) {
      state.modalStack = state.modalStack.slice(0, -1);
    },
    closeModal(state) {
      state.modalStack = [];
    },
    collapseModals(state, action: PayloadAction<CollapseModalPayload>) {
      const idx = state.modalStack.findIndex(
        m => m.name === action.payload.rootModalName,
      );
      state.modalStack =
        idx < 0 ? state.modalStack : state.modalStack.slice(0, idx);
    },
  },
  extraReducers: builder => {
    builder.addCase(setAppState, (state, action) => {
      state.isHidden = action.payload.loadingText !== null;
    });
    builder.addCase(signOut.fulfilled, () => initialState);
    builder.addCase(resetApp, () => initialState);
  },
});

export const { name, reducer, getInitialState } = modalsSlice;

export const actions = {
  ...modalsSlice.actions,
  openAccountCloseModal,
};

export const { pushModal, closeModal, collapseModals, popModal, replaceModal } =
  actions;
