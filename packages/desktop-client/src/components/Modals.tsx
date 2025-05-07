// @ts-strict-ignore
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { closeModal } from 'loot-core/client/modals/modalsSlice';
import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';

import { EditSyncAccount } from '@desktop-client/components/banksync/EditSyncAccount';
import { AccountAutocompleteModal } from '@desktop-client/components/modals/AccountAutocompleteModal';
import { AccountMenuModal } from '@desktop-client/components/modals/AccountMenuModal';
import { BudgetAutomationsModal } from '@desktop-client/components/modals/BudgetAutomationsModal';
import { BudgetFileSelectionModal } from '@desktop-client/components/modals/BudgetFileSelectionModal';
import { BudgetPageMenuModal } from '@desktop-client/components/modals/BudgetPageMenuModal';
import { CategoryAutocompleteModal } from '@desktop-client/components/modals/CategoryAutocompleteModal';
import { CategoryGroupMenuModal } from '@desktop-client/components/modals/CategoryGroupMenuModal';
import { CategoryMenuModal } from '@desktop-client/components/modals/CategoryMenuModal';
import { CloseAccountModal } from '@desktop-client/components/modals/CloseAccountModal';
import { ConfirmCategoryDeleteModal } from '@desktop-client/components/modals/ConfirmCategoryDeleteModal';
import { ConfirmTransactionDeleteModal } from '@desktop-client/components/modals/ConfirmTransactionDeleteModal';
import { ConfirmTransactionEditModal } from '@desktop-client/components/modals/ConfirmTransactionEditModal';
import { ConfirmUnlinkAccountModal } from '@desktop-client/components/modals/ConfirmUnlinkAccountModal';
import { CoverModal } from '@desktop-client/components/modals/CoverModal';
import { CreateAccountModal } from '@desktop-client/components/modals/CreateAccountModal';
import { CreateEncryptionKeyModal } from '@desktop-client/components/modals/CreateEncryptionKeyModal';
import { CreateLocalAccountModal } from '@desktop-client/components/modals/CreateLocalAccountModal';
import { EditUserAccess } from '@desktop-client/components/modals/EditAccess';
import { EditFieldModal } from '@desktop-client/components/modals/EditFieldModal';
import { EditRuleModal } from '@desktop-client/components/modals/EditRuleModal';
import { EditUserFinanceApp } from '@desktop-client/components/modals/EditUser';
import { EnvelopeBalanceMenuModal } from '@desktop-client/components/modals/EnvelopeBalanceMenuModal';
import { EnvelopeBudgetMenuModal } from '@desktop-client/components/modals/EnvelopeBudgetMenuModal';
import { EnvelopeBudgetMonthMenuModal } from '@desktop-client/components/modals/EnvelopeBudgetMonthMenuModal';
import { EnvelopeBudgetSummaryModal } from '@desktop-client/components/modals/EnvelopeBudgetSummaryModal';
import { EnvelopeToBudgetMenuModal } from '@desktop-client/components/modals/EnvelopeToBudgetMenuModal';
import { FixEncryptionKeyModal } from '@desktop-client/components/modals/FixEncryptionKeyModal';
import { GoalTemplateModal } from '@desktop-client/components/modals/GoalTemplateModal';
import { GoCardlessExternalMsgModal } from '@desktop-client/components/modals/GoCardlessExternalMsgModal';
import { GoCardlessInitialiseModal } from '@desktop-client/components/modals/GoCardlessInitialiseModal';
import { HoldBufferModal } from '@desktop-client/components/modals/HoldBufferModal';
import { ImportTransactionsModal } from '@desktop-client/components/modals/ImportTransactionsModal';
import { KeyboardShortcutModal } from '@desktop-client/components/modals/KeyboardShortcutModal';
import { LoadBackupModal } from '@desktop-client/components/modals/LoadBackupModal';
import { ConfirmChangeDocumentDirModal } from '@desktop-client/components/modals/manager/ConfirmChangeDocumentDir';
import { DeleteFileModal } from '@desktop-client/components/modals/manager/DeleteFileModal';
import { DuplicateFileModal } from '@desktop-client/components/modals/manager/DuplicateFileModal';
import { FilesSettingsModal } from '@desktop-client/components/modals/manager/FilesSettingsModal';
import { ImportActualModal } from '@desktop-client/components/modals/manager/ImportActualModal';
import { ImportModal } from '@desktop-client/components/modals/manager/ImportModal';
import { ImportYNAB4Modal } from '@desktop-client/components/modals/manager/ImportYNAB4Modal';
import { ImportYNAB5Modal } from '@desktop-client/components/modals/manager/ImportYNAB5Modal';
import { ManageRulesModal } from '@desktop-client/components/modals/ManageRulesModal';
import { MergeUnusedPayeesModal } from '@desktop-client/components/modals/MergeUnusedPayeesModal';
import { NewCategoryGroupModal } from '@desktop-client/components/modals/NewCategoryGroupModal';
import { NewCategoryModal } from '@desktop-client/components/modals/NewCategoryModal';
import { NotesModal } from '@desktop-client/components/modals/NotesModal';
import { OpenIDEnableModal } from '@desktop-client/components/modals/OpenIDEnableModal';
import { OutOfSyncMigrationsModal } from '@desktop-client/components/modals/OutOfSyncMigrationsModal';
import { PasswordEnableModal } from '@desktop-client/components/modals/PasswordEnableModal';
import { PayeeAutocompleteModal } from '@desktop-client/components/modals/PayeeAutocompleteModal';
import { PluggyAiInitialiseModal } from '@desktop-client/components/modals/PluggyAiInitialiseModal';
import { ScheduledTransactionMenuModal } from '@desktop-client/components/modals/ScheduledTransactionMenuModal';
import { SelectLinkedAccountsModal } from '@desktop-client/components/modals/SelectLinkedAccountsModal';
import { SimpleFinInitialiseModal } from '@desktop-client/components/modals/SimpleFinInitialiseModal';
import { TrackingBalanceMenuModal } from '@desktop-client/components/modals/TrackingBalanceMenuModal';
import { TrackingBudgetMenuModal } from '@desktop-client/components/modals/TrackingBudgetMenuModal';
import { TrackingBudgetMonthMenuModal } from '@desktop-client/components/modals/TrackingBudgetMonthMenuModal';
import { TrackingBudgetSummaryModal } from '@desktop-client/components/modals/TrackingBudgetSummaryModal';
import { TransferModal } from '@desktop-client/components/modals/TransferModal';
import { TransferOwnership } from '@desktop-client/components/modals/TransferOwnership';
import { CategoryLearning } from '@desktop-client/components/payees/CategoryLearning';
import { DiscoverSchedules } from '@desktop-client/components/schedules/DiscoverSchedules';
import { PostsOfflineNotification } from '@desktop-client/components/schedules/PostsOfflineNotification';
import { ScheduleDetails } from '@desktop-client/components/schedules/ScheduleDetails';
import { ScheduleLink } from '@desktop-client/components/schedules/ScheduleLink';
import { UpcomingLength } from '@desktop-client/components/schedules/UpcomingLength';
import { NamespaceContext } from '@desktop-client/components/spreadsheet/NamespaceContext';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { useModalState } from '@desktop-client/hooks/useModalState';
import { useDispatch } from '@desktop-client/redux';

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
    .map((modal, idx) => {
      const { name } = modal;
      const key = `${name}-${idx}`;
      switch (name) {
        case 'goal-templates':
          return budgetId ? <GoalTemplateModal key={key} /> : null;

        case 'category-automations-edit':
          return budgetId ? <BudgetAutomationsModal key={name} /> : null;

        case 'keyboard-shortcuts':
          // don't show the hotkey help modal when a budget is not open
          return budgetId ? <KeyboardShortcutModal key={key} /> : null;

        case 'import-transactions':
          return <ImportTransactionsModal key={key} {...modal.options} />;

        case 'add-account':
          return <CreateAccountModal key={key} {...modal.options} />;

        case 'add-local-account':
          return <CreateLocalAccountModal key={key} />;

        case 'close-account':
          return <CloseAccountModal key={key} {...modal.options} />;

        case 'select-linked-accounts':
          return <SelectLinkedAccountsModal key={key} {...modal.options} />;

        case 'confirm-category-delete':
          return <ConfirmCategoryDeleteModal key={key} {...modal.options} />;

        case 'confirm-unlink-account':
          return <ConfirmUnlinkAccountModal key={key} {...modal.options} />;

        case 'confirm-transaction-edit':
          return <ConfirmTransactionEditModal key={key} {...modal.options} />;

        case 'confirm-transaction-delete':
          return <ConfirmTransactionDeleteModal key={key} {...modal.options} />;

        case 'load-backup':
          return (
            <LoadBackupModal
              key={key}
              watchUpdates
              {...modal.options}
              backupDisabled={false}
            />
          );

        case 'manage-rules':
          return <ManageRulesModal key={key} {...modal.options} />;

        case 'edit-rule':
          return <EditRuleModal key={key} {...modal.options} />;

        case 'merge-unused-payees':
          return <MergeUnusedPayeesModal key={key} {...modal.options} />;

        case 'gocardless-init':
          return <GoCardlessInitialiseModal key={key} {...modal.options} />;

        case 'simplefin-init':
          return <SimpleFinInitialiseModal key={key} {...modal.options} />;

        case 'pluggyai-init':
          return <PluggyAiInitialiseModal key={key} {...modal.options} />;

        case 'gocardless-external-msg':
          return (
            <GoCardlessExternalMsgModal
              key={key}
              {...modal.options}
              onClose={() => {
                modal.options.onClose?.();
                send('gocardless-poll-web-token-stop');
              }}
            />
          );

        case 'create-encryption-key':
          return <CreateEncryptionKeyModal key={key} {...modal.options} />;

        case 'fix-encryption-key':
          return <FixEncryptionKeyModal key={key} {...modal.options} />;

        case 'edit-field':
          return <EditFieldModal key={key} {...modal.options} />;

        case 'category-autocomplete':
          return <CategoryAutocompleteModal key={key} {...modal.options} />;

        case 'account-autocomplete':
          return <AccountAutocompleteModal key={key} {...modal.options} />;

        case 'payee-autocomplete':
          return <PayeeAutocompleteModal key={key} {...modal.options} />;

        case 'payee-category-learning':
          return <CategoryLearning key={key} />;

        case 'new-category':
          return <NewCategoryModal key={key} {...modal.options} />;

        case 'new-category-group':
          return <NewCategoryGroupModal key={key} {...modal.options} />;

        case 'envelope-budget-summary':
          return (
            <NamespaceContext.Provider
              key={key}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetSummaryModal key={key} {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-summary':
          return <TrackingBudgetSummaryModal key={key} {...modal.options} />;

        case 'schedule-edit':
          return <ScheduleDetails key={key} {...modal.options} />;

        case 'schedule-link':
          return <ScheduleLink key={key} {...modal.options} />;

        case 'schedules-discover':
          return <DiscoverSchedules key={key} />;

        case 'schedules-upcoming-length':
          return <UpcomingLength key={key} />;

        case 'schedule-posts-offline-notification':
          return <PostsOfflineNotification key={key} />;

        case 'synced-account-edit':
          return <EditSyncAccount key={key} {...modal.options} />;

        case 'account-menu':
          return <AccountMenuModal key={key} {...modal.options} />;

        case 'category-menu':
          return <CategoryMenuModal key={key} {...modal.options} />;

        case 'envelope-budget-menu':
          return (
            <NamespaceContext.Provider
              key={key}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-menu':
          return (
            <NamespaceContext.Provider
              key={key}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBudgetMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'category-group-menu':
          return <CategoryGroupMenuModal key={key} {...modal.options} />;

        case 'notes':
          return <NotesModal key={key} {...modal.options} />;

        case 'envelope-balance-menu':
          return (
            <NamespaceContext.Provider
              key={key}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBalanceMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'envelope-summary-to-budget-menu':
          return (
            <NamespaceContext.Provider
              key={key}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeToBudgetMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'hold-buffer':
          return (
            <NamespaceContext.Provider
              key={key}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <HoldBufferModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'tracking-balance-menu':
          return (
            <NamespaceContext.Provider
              key={key}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBalanceMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'transfer':
          return <TransferModal key={key} {...modal.options} />;

        case 'cover':
          return <CoverModal key={key} {...modal.options} />;

        case 'scheduled-transaction-menu':
          return <ScheduledTransactionMenuModal key={key} {...modal.options} />;

        case 'budget-page-menu':
          return <BudgetPageMenuModal key={key} {...modal.options} />;

        case 'envelope-budget-month-menu':
          return (
            <NamespaceContext.Provider
              key={key}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetMonthMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-month-menu':
          return (
            <NamespaceContext.Provider
              key={key}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBudgetMonthMenuModal {...modal.options} />
            </NamespaceContext.Provider>
          );

        case 'budget-file-selection':
          return <BudgetFileSelectionModal key={name} />;
        case 'delete-budget':
          return <DeleteFileModal key={key} {...modal.options} />;
        case 'duplicate-budget':
          return <DuplicateFileModal key={key} {...modal.options} />;
        case 'import':
          return <ImportModal key={key} />;
        case 'files-settings':
          return <FilesSettingsModal key={key} />;
        case 'confirm-change-document-dir':
          return <ConfirmChangeDocumentDirModal key={key} {...modal.options} />;
        case 'import-ynab4':
          return <ImportYNAB4Modal key={key} />;
        case 'import-ynab5':
          return <ImportYNAB5Modal key={key} />;
        case 'import-actual':
          return <ImportActualModal key={key} />;

        case 'out-of-sync-migrations':
          return <OutOfSyncMigrationsModal key={key} />;

        case 'edit-access':
          return <EditUserAccess key={key} {...modal.options} />;

        case 'edit-user':
          return <EditUserFinanceApp key={key} {...modal.options} />;

        case 'transfer-ownership':
          return <TransferOwnership key={key} {...modal.options} />;

        case 'enable-openid':
          return <OpenIDEnableModal key={key} {...modal.options} />;

        case 'enable-password-auth':
          return <PasswordEnableModal key={key} {...modal.options} />;

        default:
          throw new Error('Unknown modal');
      }
    })
    .map((modal, idx) => (
      <React.Fragment key={`${modalStack[idx].name}-${idx}`}>
        {modal}
      </React.Fragment>
    ));

  // fragment needed per TS types
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{modals}</>;
}
