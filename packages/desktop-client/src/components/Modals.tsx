// @ts-strict-ignore
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { closeModal } from 'loot-core/client/modals/modalsSlice';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';

import { useMetadataPref } from '../hooks/useMetadataPref';
import { useModalState } from '../hooks/useModalState';
import { useDispatch } from '../redux';

import { AccountAutocompleteModal } from './modals/AccountAutocompleteModal';
import { AccountMenuModal } from './modals/AccountMenuModal';
import { BudgetListModal } from './modals/BudgetListModal';
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
          return (
            <CreateAccountModal
              key={name}
              upgradingAccountId={modal.options.upgradingAccountId}
            />
          );

        case 'add-local-account':
          return <CreateLocalAccountModal key={name} />;

        case 'close-account':
          return (
            <CloseAccountModal
              key={name}
              account={modal.options.account}
              balance={modal.options.balance}
              canDelete={modal.options.canDelete}
            />
          );

        case 'select-linked-accounts':
          return (
            <SelectLinkedAccountsModal
              key={name}
              externalAccounts={modal.options.externalAccounts}
              requisitionId={modal.options.requisitionId}
              syncSource={modal.options.syncSource}
            />
          );

        case 'confirm-category-delete':
          return (
            <ConfirmCategoryDeleteModal
              key={name}
              category={modal.options.category}
              group={modal.options.group}
              onDelete={modal.options.onDelete}
            />
          );

        case 'confirm-unlink-account':
          return (
            <ConfirmUnlinkAccountModal
              key={name}
              accountName={modal.options.accountName}
              onUnlink={modal.options.onUnlink}
            />
          );

        case 'confirm-transaction-edit':
          return (
            <ConfirmTransactionEditModal
              key={name}
              onCancel={modal.options.onCancel}
              onConfirm={modal.options.onConfirm}
              confirmReason={modal.options.confirmReason}
            />
          );

        case 'confirm-transaction-delete':
          return (
            <ConfirmTransactionDeleteModal
              key={name}
              message={modal.options.message}
              onConfirm={modal.options.onConfirm}
            />
          );

        case 'load-backup':
          return (
            <LoadBackupModal
              key={name}
              watchUpdates
              budgetId={modal.options.budgetId}
              backupDisabled={false}
            />
          );

        case 'manage-rules':
          return (
            <ManageRulesModal key={name} payeeId={modal.options.payeeId} />
          );

        case 'edit-rule':
          return (
            <EditRuleModal
              key={name}
              rule={modal.options.rule}
              onSave={modal.options.onSave}
            />
          );

        case 'merge-unused-payees':
          return (
            <MergeUnusedPayeesModal
              key={name}
              payeeIds={modal.options.payeeIds}
              targetPayeeId={modal.options.targetPayeeId}
            />
          );

        case 'gocardless-init':
          return (
            <GoCardlessInitialiseModal
              key={name}
              onSuccess={modal.options.onSuccess}
            />
          );

        case 'simplefin-init':
          return (
            <SimpleFinInitialiseModal
              key={name}
              onSuccess={modal.options.onSuccess}
            />
          );

        case 'gocardless-external-msg':
          return (
            <GoCardlessExternalMsgModal
              key={name}
              onMoveExternal={modal.options.onMoveExternal}
              onClose={() => {
                modal.options.onClose?.();
                send('gocardless-poll-web-token-stop');
              }}
              onSuccess={modal.options.onSuccess}
            />
          );

        case 'create-encryption-key':
          return (
            <CreateEncryptionKeyModal
              key={name}
              recreate={modal.options.recreate}
            />
          );

        case 'fix-encryption-key':
          return (
            <FixEncryptionKeyModal
              key={name}
              cloudFileId={modal.options.cloudFileId}
              hasExistingKey={modal.options.hasExistingKey}
              onSuccess={modal.options.onSuccess}
            />
          );

        case 'edit-field':
          return (
            <EditFieldModal
              key={name}
              name={modal.options.name}
              onSubmit={modal.options.onSubmit}
              onClose={modal.options.onClose}
            />
          );

        case 'category-autocomplete':
          return (
            <CategoryAutocompleteModal
              key={name}
              onSelect={modal.options.onSelect}
              categoryGroups={modal.options.categoryGroups}
              showHiddenCategories={modal.options.showHiddenCategories}
              month={modal.options.month}
              onClose={modal.options.onClose}
            />
          );

        case 'account-autocomplete':
          return (
            <AccountAutocompleteModal
              key={name}
              onSelect={modal.options.onSelect}
              includeClosedAccounts={modal.options.includeClosedAccounts}
              onClose={modal.options.onClose}
            />
          );

        case 'payee-autocomplete':
          return (
            <PayeeAutocompleteModal
              key={name}
              onSelect={modal.options.onSelect}
              onClose={modal.options.onClose}
            />
          );

        case 'payee-category-learning':
          return <CategoryLearning key={name} />;

        case 'new-category':
          return (
            <NewCategoryModal
              key={name}
              onValidate={modal.options.onValidate}
              onSubmit={modal.options.onSubmit}
            />
          );

        case 'new-category-group':
          return (
            <NewCategoryGroupModal
              key={name}
              onValidate={modal.options.onValidate}
              onSubmit={modal.options.onSubmit}
            />
          );

        case 'envelope-budget-summary':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetSummaryModal
                key={name}
                month={modal.options.month}
                onBudgetAction={modal.options.onBudgetAction}
              />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-summary':
          return (
            <TrackingBudgetSummaryModal
              key={name}
              month={modal.options.month}
            />
          );

        case 'schedule-edit':
          return (
            <ScheduleDetails
              key={name}
              id={modal.options.id || null}
              transaction={modal.options.transaction || null}
            />
          );

        case 'schedule-link':
          return (
            <ScheduleLink
              key={name}
              transactionIds={modal.options.transactionIds}
              getTransaction={modal.options.getTransaction}
              accountName={modal.options.accountName}
              onScheduleLinked={modal.options.onScheduleLinked}
            />
          );

        case 'schedules-discover':
          return <DiscoverSchedules key={name} />;

        case 'schedules-upcoming-length':
          return <UpcomingLength key={name} />;

        case 'schedule-posts-offline-notification':
          return <PostsOfflineNotification key={name} />;

        case 'account-menu':
          return (
            <AccountMenuModal
              key={name}
              accountId={modal.options.accountId}
              onSave={modal.options.onSave}
              onEditNotes={modal.options.onEditNotes}
              onCloseAccount={modal.options.onCloseAccount}
              onReopenAccount={modal.options.onReopenAccount}
              onClose={modal.options.onClose}
            />
          );

        case 'category-menu':
          return (
            <CategoryMenuModal
              key={name}
              categoryId={modal.options.categoryId}
              onSave={modal.options.onSave}
              onEditNotes={modal.options.onEditNotes}
              onDelete={modal.options.onDelete}
              onToggleVisibility={modal.options.onToggleVisibility}
              onClose={modal.options.onClose}
            />
          );

        case 'envelope-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetMenuModal
                categoryId={modal.options.categoryId}
                onUpdateBudget={modal.options.onUpdateBudget}
                onCopyLastMonthAverage={modal.options.onCopyLastMonthAverage}
                onSetMonthsAverage={modal.options.onSetMonthsAverage}
                onApplyBudgetTemplate={modal.options.onApplyBudgetTemplate}
              />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBudgetMenuModal
                categoryId={modal.options.categoryId}
                onUpdateBudget={modal.options.onUpdateBudget}
                onCopyLastMonthAverage={modal.options.onCopyLastMonthAverage}
                onSetMonthsAverage={modal.options.onSetMonthsAverage}
                onApplyBudgetTemplate={modal.options.onApplyBudgetTemplate}
              />
            </NamespaceContext.Provider>
          );

        case 'category-group-menu':
          return (
            <CategoryGroupMenuModal
              key={name}
              groupId={modal.options.groupId}
              onSave={modal.options.onSave}
              onAddCategory={modal.options.onAddCategory}
              onEditNotes={modal.options.onEditNotes}
              onDelete={modal.options.onDelete}
              onToggleVisibility={modal.options.onToggleVisibility}
              onClose={modal.options.onClose}
            />
          );

        case 'notes':
          return (
            <NotesModal
              key={name}
              id={modal.options.id}
              name={modal.options.name}
              onSave={modal.options.onSave}
            />
          );

        case 'envelope-balance-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBalanceMenuModal
                categoryId={modal.options.categoryId}
                onCarryover={modal.options.onCarryover}
                onTransfer={modal.options.onTransfer}
                onCover={modal.options.onCover}
              />
            </NamespaceContext.Provider>
          );

        case 'envelope-summary-to-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeToBudgetMenuModal
                onTransfer={modal.options.onTransfer}
                onCover={modal.options.onCover}
                onHoldBuffer={modal.options.onHoldBuffer}
                onResetHoldBuffer={modal.options.onResetHoldBuffer}
              />
            </NamespaceContext.Provider>
          );

        case 'hold-buffer':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <HoldBufferModal
                month={modal.options.month}
                onSubmit={modal.options.onSubmit}
              />
            </NamespaceContext.Provider>
          );

        case 'tracking-balance-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBalanceMenuModal
                categoryId={modal.options.categoryId}
                onCarryover={modal.options.onCarryover}
              />
            </NamespaceContext.Provider>
          );

        case 'transfer':
          return (
            <TransferModal
              key={name}
              title={modal.options.title}
              categoryId={modal.options.categoryId}
              month={modal.options.month}
              amount={modal.options.amount}
              onSubmit={modal.options.onSubmit}
              showToBeBudgeted={modal.options.showToBeBudgeted}
            />
          );

        case 'cover':
          return (
            <CoverModal
              key={name}
              title={modal.options.title}
              categoryId={modal.options.categoryId}
              month={modal.options.month}
              showToBeBudgeted={modal.options.showToBeBudgeted}
              onSubmit={modal.options.onSubmit}
            />
          );

        case 'scheduled-transaction-menu':
          return (
            <ScheduledTransactionMenuModal
              key={name}
              transactionId={modal.options.transactionId}
              onPost={modal.options.onPost}
              onSkip={modal.options.onSkip}
            />
          );

        case 'budget-page-menu':
          return (
            <BudgetPageMenuModal
              key={name}
              onAddCategoryGroup={modal.options.onAddCategoryGroup}
              onToggleHiddenCategories={modal.options.onToggleHiddenCategories}
              onSwitchBudgetFile={modal.options.onSwitchBudgetFile}
            />
          );

        case 'envelope-budget-month-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <EnvelopeBudgetMonthMenuModal
                month={modal.options.month}
                onBudgetAction={modal.options.onBudgetAction}
                onEditNotes={modal.options.onEditNotes}
              />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-month-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(modal.options.month)}
            >
              <TrackingBudgetMonthMenuModal
                month={modal.options.month}
                onBudgetAction={modal.options.onBudgetAction}
                onEditNotes={modal.options.onEditNotes}
              />
            </NamespaceContext.Provider>
          );

        case 'budget-list':
          return <BudgetListModal key={name} />;
        case 'delete-budget':
          return <DeleteFileModal key={name} file={modal.options.file} />;
        case 'duplicate-budget':
          return (
            <DuplicateFileModal
              key={name}
              file={modal.options.file}
              managePage={modal.options.managePage}
              loadBudget={modal.options.loadBudget}
              onComplete={modal.options.onComplete}
            />
          );
        case 'import':
          return <ImportModal key={name} />;
        case 'files-settings':
          return <FilesSettingsModal key={name} />;
        case 'confirm-change-document-dir':
          return (
            <ConfirmChangeDocumentDirModal
              key={name}
              currentBudgetDirectory={modal.options.currentBudgetDirectory}
              newDirectory={modal.options.newDirectory}
            />
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
          return (
            <EditUserAccess
              key={name}
              access={modal.options.access}
              onSave={modal.options.onSave}
            />
          );

        case 'edit-user':
          return (
            <EditUserFinanceApp
              key={name}
              user={modal.options.user}
              onSave={modal.options.onSave}
            />
          );

        case 'transfer-ownership':
          return <TransferOwnership key={name} onSave={modal.options.onSave} />;

        case 'enable-openid':
          return <OpenIDEnableModal key={name} onSave={modal.options.onSave} />;

        case 'enable-password-auth':
          return (
            <PasswordEnableModal key={name} onSave={modal.options.onSave} />
          );

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
