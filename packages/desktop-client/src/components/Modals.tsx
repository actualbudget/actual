// @ts-strict-ignore
import React, { useEffect } from 'react';
import { useLocation } from 'react-router';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';

import { EditSyncAccount } from './banksync/EditSyncAccount';
import { AccountAutocompleteModal } from './modals/AccountAutocompleteModal';
import { AccountMenuModal } from './modals/AccountMenuModal';
import { BudgetAutomationsModal } from './modals/BudgetAutomationsModal';
import { BudgetFileSelectionModal } from './modals/BudgetFileSelectionModal';
import { BudgetPageMenuModal } from './modals/BudgetPageMenuModal';
import { CategoryAutocompleteModal } from './modals/CategoryAutocompleteModal';
import { CategoryGroupMenuModal } from './modals/CategoryGroupMenuModal';
import { CategoryMenuModal } from './modals/CategoryMenuModal';
import { CloseAccountModal } from './modals/CloseAccountModal';
import { ConfirmCategoryDeleteModal } from './modals/ConfirmCategoryDeleteModal';
import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
import { ConfirmTransactionEditModal } from './modals/ConfirmTransactionEditModal';
import { ConfirmUnlinkAccountModal } from './modals/ConfirmUnlinkAccountModal';
import { ConvertToScheduleModal } from './modals/ConvertToScheduleModal';
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
import { EnvelopeIncomeBalanceMenuModal } from './modals/EnvelopeIncomeBalanceMenuModal';
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
import { SchedulesPageMenuModal } from './modals/SchedulesPageMenuModal';
import { SelectLinkedAccountsModal } from './modals/SelectLinkedAccountsModal';
import { SimpleFinInitialiseModal } from './modals/SimpleFinInitialiseModal';
import { TrackingBalanceMenuModal } from './modals/TrackingBalanceMenuModal';
import { TrackingBudgetMenuModal } from './modals/TrackingBudgetMenuModal';
import { TrackingBudgetMonthMenuModal } from './modals/TrackingBudgetMonthMenuModal';
import { TrackingBudgetSummaryModal } from './modals/TrackingBudgetSummaryModal';
import { TransferModal } from './modals/TransferModal';
import { TransferOwnership } from './modals/TransferOwnership';
import { UnmigrateBudgetAutomationsModal } from './modals/UnmigrateBudgetAutomationsModal';
import { CategoryLearning } from './payees/CategoryLearning';
import { DiscoverSchedules } from './schedules/DiscoverSchedules';
import { PostsOfflineNotification } from './schedules/PostsOfflineNotification';
import { ScheduleEditModal } from './schedules/ScheduleEditModal';
import { ScheduleLink } from './schedules/ScheduleLink';
import { UpcomingLength } from './schedules/UpcomingLength';

import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { useModalState } from '@desktop-client/hooks/useModalState';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { closeModal } from '@desktop-client/modals/modalsSlice';
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
          return budgetId ? (
            <BudgetAutomationsModal key={name} {...modal.options} />
          ) : null;

        case 'category-automations-unmigrate':
          return budgetId ? (
            <UnmigrateBudgetAutomationsModal key={name} {...modal.options} />
          ) : null;

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

        case 'convert-to-schedule':
          return <ConvertToScheduleModal key={key} {...modal.options} />;

        case 'confirm-delete':
          return <ConfirmDeleteModal key={key} {...modal.options} />;

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
            <SheetNameProvider
              key={key}
              name={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetSummaryModal key={key} {...modal.options} />
            </SheetNameProvider>
          );

        case 'tracking-budget-summary':
          return <TrackingBudgetSummaryModal key={key} {...modal.options} />;

        case 'schedule-edit':
          return <ScheduleEditModal key={key} {...modal.options} />;

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
            <SheetNameProvider
              key={key}
              name={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetMenuModal {...modal.options} />
            </SheetNameProvider>
          );

        case 'tracking-budget-menu':
          return (
            <SheetNameProvider
              key={key}
              name={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBudgetMenuModal {...modal.options} />
            </SheetNameProvider>
          );

        case 'category-group-menu':
          return <CategoryGroupMenuModal key={key} {...modal.options} />;

        case 'notes':
          return <NotesModal key={key} {...modal.options} />;

        case 'envelope-balance-menu':
          return (
            <SheetNameProvider
              key={key}
              name={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBalanceMenuModal {...modal.options} />
            </SheetNameProvider>
          );

        case 'envelope-income-balance-menu':
          return (
            <SheetNameProvider
              key={key}
              name={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeIncomeBalanceMenuModal {...modal.options} />
            </SheetNameProvider>
          );

        case 'envelope-summary-to-budget-menu':
          return (
            <SheetNameProvider
              key={key}
              name={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeToBudgetMenuModal {...modal.options} />
            </SheetNameProvider>
          );

        case 'hold-buffer':
          return (
            <SheetNameProvider
              key={key}
              name={monthUtils.sheetForMonth(modal.options.month)}
            >
              <HoldBufferModal {...modal.options} />
            </SheetNameProvider>
          );

        case 'tracking-balance-menu':
          return (
            <SheetNameProvider
              key={key}
              name={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBalanceMenuModal {...modal.options} />
            </SheetNameProvider>
          );

        case 'transfer':
          return <TransferModal key={key} {...modal.options} />;

        case 'cover':
          return <CoverModal key={key} {...modal.options} />;

        case 'scheduled-transaction-menu':
          return <ScheduledTransactionMenuModal key={key} {...modal.options} />;

        case 'budget-page-menu':
          return <BudgetPageMenuModal key={key} {...modal.options} />;

        case 'schedules-page-menu':
          return <SchedulesPageMenuModal key={key} />;

        case 'envelope-budget-month-menu':
          return (
            <SheetNameProvider
              key={key}
              name={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetMonthMenuModal {...modal.options} />
            </SheetNameProvider>
          );

        case 'tracking-budget-month-menu':
          return (
            <SheetNameProvider
              key={key}
              name={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBudgetMonthMenuModal {...modal.options} />
            </SheetNameProvider>
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
  // oxlint-disable-next-line react/jsx-no-useless-fragment
  return <>{modals}</>;
}
