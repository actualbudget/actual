// @ts-strict-ignore
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { closeModal } from 'loot-core/client/modals/modalsSlice';
import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';

import { useMetadataPref } from '../hooks/useMetadataPref';
import { useModalState } from '../hooks/useModalState';
import { useDispatch } from '../redux';

import { EditSyncAccount } from './banksync/EditSyncAccount';
import { AccountAutocompleteModal } from './modals/AccountAutocompleteModal';
import { AccountMenuModal } from './modals/AccountMenuModal';
import { BudgetFileSelectionModal } from './modals/BudgetFileSelectionModal';
import { BudgetPageMenuModal } from './modals/BudgetPageMenuModal';
import { CategoryAutocompleteModal } from './modals/CategoryAutocompleteModal';
import { CategoryGroupMenuModal } from './modals/CategoryGroupMenuModal';
import { CategoryMenuModal } from './modals/CategoryMenuModal';
import { CloseAccountModal } from './modals/CloseAccountModal';
import { ConfirmCategoryDeleteModal } from './modals/ConfirmCategoryDeleteModal';
import { ConfirmTransactionDeleteModal } from './modals/ConfirmTransactionDeleteModal';
import { ConfirmTransactionEditModal } from './modals/ConfirmTransactionEditModal';
import { ConfirmUnlinkAccountModal } from './modals/ConfirmUnlinkAccountModal';
import { CoverModal } from './modals/CoverModal';
import { CreateAccountModal } from './modals/CreateAccountModal';
import { CreateEncryptionKeyModal } from './modals/CreateEncryptionKeyModal';
import { CreateLocalAccountModal } from './modals/CreateLocalAccountModal';
import { EditUserAccess } from './modals/EditAccess';
import { EditFieldModal } from './modals/EditFieldModal';
import { EditRuleModal } from './modals/EditRuleModal';
import { EditUserFinanceApp } from './modals/EditUser';
import { EnvelopeBalanceMenuModal } from './modals/EnvelopeBalanceMenuModal';
import { EnvelopeBudgetMenuModal } from './modals/EnvelopeBudgetMenuModal';
import { EnvelopeBudgetMonthMenuModal } from './modals/EnvelopeBudgetMonthMenuModal';
import { EnvelopeBudgetSummaryModal } from './modals/EnvelopeBudgetSummaryModal';
import { EnvelopeToBudgetMenuModal } from './modals/EnvelopeToBudgetMenuModal';
import { FixEncryptionKeyModal } from './modals/FixEncryptionKeyModal';
import { GoalTemplateModal } from './modals/GoalTemplateModal';
import { GoCardlessExternalMsgModal } from './modals/GoCardlessExternalMsgModal';
import { GoCardlessInitialiseModal } from './modals/GoCardlessInitialiseModal';
import { HoldBufferModal } from './modals/HoldBufferModal';
import { ImportTransactionsModal } from './modals/ImportTransactionsModal';
import { KeyboardShortcutModal } from './modals/KeyboardShortcutModal';
import { LoadBackupModal } from './modals/LoadBackupModal';
import { ConfirmChangeDocumentDirModal } from './modals/manager/ConfirmChangeDocumentDir';
import { DeleteFileModal } from './modals/manager/DeleteFileModal';
import { DuplicateFileModal } from './modals/manager/DuplicateFileModal';
import { FilesSettingsModal } from './modals/manager/FilesSettingsModal';
import { ImportActualModal } from './modals/manager/ImportActualModal';
import { ImportModal } from './modals/manager/ImportModal';
import { ImportYNAB4Modal } from './modals/manager/ImportYNAB4Modal';
import { ImportYNAB5Modal } from './modals/manager/ImportYNAB5Modal';
import { ManageRulesModal } from './modals/ManageRulesModal';
import { MergeUnusedPayeesModal } from './modals/MergeUnusedPayeesModal';
import { NewCategoryGroupModal } from './modals/NewCategoryGroupModal';
import { NewCategoryModal } from './modals/NewCategoryModal';
import { NotesModal } from './modals/NotesModal';
import { OpenIDEnableModal } from './modals/OpenIDEnableModal';
import { OutOfSyncMigrationsModal } from './modals/OutOfSyncMigrationsModal';
import { PasswordEnableModal } from './modals/PasswordEnableModal';
import { PayeeAutocompleteModal } from './modals/PayeeAutocompleteModal';
import { PluggyAiInitialiseModal } from './modals/PluggyAiInitialiseModal';
import { ScheduledTransactionMenuModal } from './modals/ScheduledTransactionMenuModal';
import { SelectLinkedAccountsModal } from './modals/SelectLinkedAccountsModal';
import { SimpleFinInitialiseModal } from './modals/SimpleFinInitialiseModal';
import { TrackingBalanceMenuModal } from './modals/TrackingBalanceMenuModal';
import { TrackingBudgetMenuModal } from './modals/TrackingBudgetMenuModal';
import { TrackingBudgetMonthMenuModal } from './modals/TrackingBudgetMonthMenuModal';
import { TrackingBudgetSummaryModal } from './modals/TrackingBudgetSummaryModal';
import { TransferModal } from './modals/TransferModal';
import { TransferOwnership } from './modals/TransferOwnership';
import { CategoryLearning } from './payees/CategoryLearning';
import { DiscoverSchedules } from './schedules/DiscoverSchedules';
import { PostsOfflineNotification } from './schedules/PostsOfflineNotification';
import { ScheduleDetails } from './schedules/ScheduleDetails';
import { ScheduleLink } from './schedules/ScheduleLink';
import { UpcomingLength } from './schedules/UpcomingLength';
import { NamespaceContext } from './spreadsheet/NamespaceContext';

export function Modals() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { modalStack } = useModalState();
  const [budgetId] = useMetadataPref('id');

  useEffect(() => {
    if (modalStack.length > 0) {
      dispatch(closeModal());
    }
  }, [location]);

  const modals = modalStack
    .map(modal => {
      const { name } = modal;
      switch (name) {
        case 'goal-templates':
          return budgetId ? <GoalTemplateModal key={name} /> : null;

        case 'keyboard-shortcuts':
          // don't show the hotkey help modal when a budget is not open
          return budgetId ? <KeyboardShortcutModal key={name} /> : null;

        case 'import-transactions':
          return <ImportTransactionsModal key={name} {...modal.options} />;

        case 'add-account':
          return <CreateAccountModal key={name} {...modal.options} />;

        case 'add-local-account':
          return <CreateLocalAccountModal key={name} />;

        case 'close-account':
          return <CloseAccountModal key={name} {...modal.options} />;

        case 'select-linked-accounts':
          return <SelectLinkedAccountsModal key={name} {...modal.options} />;

        case 'confirm-category-delete':
          return <ConfirmCategoryDeleteModal key={name} {...modal.options} />;

        case 'confirm-unlink-account':
          return <ConfirmUnlinkAccountModal key={name} {...modal.options} />;

        case 'confirm-transaction-edit':
          return <ConfirmTransactionEditModal key={name} {...modal.options} />;

        case 'confirm-transaction-delete':
          return (
            <ConfirmTransactionDeleteModal key={name} {...modal.options} />
          );

        case 'load-backup':
          return (
            <LoadBackupModal
              key={name}
              watchUpdates
              {...modal.options}
              backupDisabled={false}
            />
          );

        case 'manage-rules':
          return <ManageRulesModal key={name} {...modal.options} />;

        case 'edit-rule':
          return <EditRuleModal key={name} {...modal.options} />;

        case 'merge-unused-payees':
          return <MergeUnusedPayeesModal key={name} {...modal.options} />;

        case 'gocardless-init':
          return <GoCardlessInitialiseModal key={name} {...modal.options} />;

        case 'simplefin-init':
          return <SimpleFinInitialiseModal key={name} {...modal.options} />;

        case 'pluggyai-init':
          return <PluggyAiInitialiseModal key={name} {...modal.options} />;

        case 'gocardless-external-msg':
          return (
            <GoCardlessExternalMsgModal
              key={name}
              {...modal.options}
              onClose={() => {
                modal.options.onClose?.();
                send('gocardless-poll-web-token-stop');
              }}
            />
          );

        case 'create-encryption-key':
          return <CreateEncryptionKeyModal key={name} {...modal.options} />;

        case 'fix-encryption-key':
          return <FixEncryptionKeyModal key={name} {...modal.options} />;

        case 'edit-field':
          return <EditFieldModal key={name} {...modal.options} />;

        case 'category-autocomplete':
          return <CategoryAutocompleteModal key={name} {...modal.options} />;

        case 'account-autocomplete':
          return <AccountAutocompleteModal key={name} {...modal.options} />;

        case 'payee-autocomplete':
          return <PayeeAutocompleteModal key={name} {...modal.options} />;

        case 'payee-category-learning':
          return <CategoryLearning key={name} />;

        case 'new-category':
          return <NewCategoryModal key={name} {...modal.options} />;

        case 'new-category-group':
          return <NewCategoryGroupModal key={name} {...modal.options} />;

        case 'envelope-budget-summary':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetSummaryModal key={name} {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-summary':
          return <TrackingBudgetSummaryModal key={name} {...modal.options} />;

        case 'schedule-edit':
          return <ScheduleDetails key={name} {...modal.options} />;

        case 'schedule-link':
          return <ScheduleLink key={name} {...modal.options} />;

        case 'schedules-discover':
          return <DiscoverSchedules key={name} />;

        case 'schedules-upcoming-length':
          return <UpcomingLength key={name} />;

        case 'schedule-posts-offline-notification':
          return <PostsOfflineNotification key={name} />;

        case 'synced-account-edit':
          return <EditSyncAccount key={name} {...modal.options} />;

        case 'account-menu':
          return <AccountMenuModal key={name} {...modal.options} />;

        case 'category-menu':
          return <CategoryMenuModal key={name} {...modal.options} />;

        case 'envelope-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBudgetMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'category-group-menu':
          return <CategoryGroupMenuModal key={name} {...modal.options} />;

        case 'notes':
          return <NotesModal key={name} {...modal.options} />;

        case 'envelope-balance-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBalanceMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'envelope-summary-to-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeToBudgetMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'hold-buffer':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <HoldBufferModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'tracking-balance-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBalanceMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'transfer':
          return <TransferModal key={name} {...modal.options} />;

        case 'cover':
          return <CoverModal key={name} {...modal.options} />;

        case 'scheduled-transaction-menu':
          return (
            <ScheduledTransactionMenuModal key={name} {...modal.options} />
          );

        case 'budget-page-menu':
          return <BudgetPageMenuModal key={name} {...modal.options} />;

        case 'envelope-budget-month-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetMonthMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-month-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBudgetMonthMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'budget-file-selection':
          return <BudgetFileSelectionModal key={name} />;
        case 'delete-budget':
          return <DeleteFileModal key={name} {...modal.options} />;
        case 'duplicate-budget':
          return <DuplicateFileModal key={name} {...modal.options} />;
        case 'import':
          return <ImportModal key={name} />;
        case 'files-settings':
          return <FilesSettingsModal key={name} />;
        case 'confirm-change-document-dir':
          return (
            <ConfirmChangeDocumentDirModal key={name} {...modal.options} />
          );
        case 'import-ynab4':
          return <ImportYNAB4Modal key={name} />;
        case 'import-ynab5':
          return <ImportYNAB5Modal key={name} />;
        case 'import-actual':
          return <ImportActualModal key={name} />;

        case 'out-of-sync-migrations':
          return <OutOfSyncMigrationsModal key={name} />;

        case 'edit-access':
          return <EditUserAccess key={name} {...modal.options} />;

        case 'edit-user':
          return <EditUserFinanceApp key={name} {...modal.options} />;

        case 'transfer-ownership':
          return <TransferOwnership key={name} {...modal.options} />;

        case 'enable-openid':
          return <OpenIDEnableModal key={name} {...modal.options} />;

        case 'enable-password-auth':
          return <PasswordEnableModal key={name} {...modal.options} />;

        default:
          throw new Error('Unknown modal');
      }
    })
    .map((modal, idx) => (
      <React.Fragment key={modalStack[idx].name}>{modal}</React.Fragment>
    ));

  // fragment needed per TS types
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{modals}</>;
}
