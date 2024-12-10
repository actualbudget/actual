// @ts-strict-ignore
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { closeModal } from 'loot-core/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';

import { useMetadataPref } from '../hooks/useMetadataPref';
import { useModalState } from '../hooks/useModalState';

import { ModalTitle, ModalHeader } from './common/Modal';
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
import { EditFieldModal } from './modals/EditFieldModal';
import { EditRuleModal } from './modals/EditRuleModal';
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
import { NotesModal } from './modals/NotesModal';
import { OutOfSyncMigrationsModal } from './modals/OutOfSyncMigrationsModal';
import { PayeeAutocompleteModal } from './modals/PayeeAutocompleteModal';
import { ScheduledTransactionMenuModal } from './modals/ScheduledTransactionMenuModal';
import { SelectLinkedAccountsModal } from './modals/SelectLinkedAccountsModal';
import { SimpleFinInitialiseModal } from './modals/SimpleFinInitialiseModal';
import { SingleInputModal } from './modals/SingleInputModal';
import { TrackingBalanceMenuModal } from './modals/TrackingBalanceMenuModal';
import { TrackingBudgetMenuModal } from './modals/TrackingBudgetMenuModal';
import { TrackingBudgetMonthMenuModal } from './modals/TrackingBudgetMonthMenuModal';
import { TrackingBudgetSummaryModal } from './modals/TrackingBudgetSummaryModal';
import { TransferModal } from './modals/TransferModal';
import { DiscoverSchedules } from './schedules/DiscoverSchedules';
import { PostsOfflineNotification } from './schedules/PostsOfflineNotification';
import { ScheduleDetails } from './schedules/ScheduleDetails';
import { ScheduleLink } from './schedules/ScheduleLink';
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

  const { t } = useTranslation();

  const modals = modalStack
    .map(({ name, options }) => {
      switch (name) {
        case 'goal-templates':
          return budgetId ? <GoalTemplateModal key={name} /> : null;

        case 'keyboard-shortcuts':
          // don't show the hotkey help modal when a budget is not open
          return budgetId ? <KeyboardShortcutModal key={name} /> : null;

        case 'import-transactions':
          return <ImportTransactionsModal key={name} options={options} />;

        case 'add-account':
          return (
            <CreateAccountModal
              key={name}
              upgradingAccountId={options?.upgradingAccountId}
            />
          );

        case 'add-local-account':
          return <CreateLocalAccountModal key={name} />;

        case 'close-account':
          return (
            <CloseAccountModal
              key={name}
              account={options.account}
              balance={options.balance}
              canDelete={options.canDelete}
            />
          );

        case 'select-linked-accounts':
          return (
            <SelectLinkedAccountsModal
              key={name}
              externalAccounts={options.accounts}
              requisitionId={options.requisitionId}
              syncSource={options.syncSource}
            />
          );

        case 'confirm-category-delete':
          return (
            <ConfirmCategoryDeleteModal
              key={name}
              category={options.category}
              group={options.group}
              onDelete={options.onDelete}
            />
          );

        case 'confirm-unlink-account':
          return (
            <ConfirmUnlinkAccountModal
              key={name}
              accountName={options.accountName}
              onUnlink={options.onUnlink}
            />
          );

        case 'confirm-transaction-edit':
          return (
            <ConfirmTransactionEditModal
              key={name}
              onCancel={options.onCancel}
              onConfirm={options.onConfirm}
              confirmReason={options.confirmReason}
            />
          );

        case 'confirm-transaction-delete':
          return (
            <ConfirmTransactionDeleteModal
              key={name}
              message={options.message}
              onConfirm={options.onConfirm}
            />
          );

        case 'load-backup':
          return (
            <LoadBackupModal
              key={name}
              watchUpdates
              budgetId={options.budgetId}
              backupDisabled={false}
            />
          );

        case 'manage-rules':
          return <ManageRulesModal key={name} payeeId={options?.payeeId} />;

        case 'edit-rule':
          return (
            <EditRuleModal
              key={name}
              defaultRule={options.rule}
              onSave={options.onSave}
            />
          );

        case 'merge-unused-payees':
          return (
            <MergeUnusedPayeesModal
              key={name}
              payeeIds={options.payeeIds}
              targetPayeeId={options.targetPayeeId}
            />
          );

        case 'gocardless-init':
          return (
            <GoCardlessInitialiseModal
              key={name}
              onSuccess={options.onSuccess}
            />
          );

        case 'simplefin-init':
          return (
            <SimpleFinInitialiseModal
              key={name}
              onSuccess={options.onSuccess}
            />
          );

        case 'gocardless-external-msg':
          return (
            <GoCardlessExternalMsgModal
              key={name}
              onMoveExternal={options.onMoveExternal}
              onClose={() => {
                options.onClose?.();
                send('gocardless-poll-web-token-stop');
              }}
              onSuccess={options.onSuccess}
            />
          );

        case 'create-encryption-key':
          return <CreateEncryptionKeyModal key={name} options={options} />;

        case 'fix-encryption-key':
          return <FixEncryptionKeyModal key={name} options={options} />;

        case 'edit-field':
          return (
            <EditFieldModal
              key={name}
              name={options.name}
              onSubmit={options.onSubmit}
              onClose={options.onClose}
            />
          );

        case 'category-autocomplete':
          return (
            <CategoryAutocompleteModal
              key={name}
              autocompleteProps={{
                value: null,
                onSelect: options.onSelect,
                categoryGroups: options.categoryGroups,
                showHiddenCategories: options.showHiddenCategories,
              }}
              month={options.month}
              onClose={options.onClose}
            />
          );

        case 'account-autocomplete':
          return (
            <AccountAutocompleteModal
              key={name}
              autocompleteProps={{
                value: null,
                onSelect: options.onSelect,
                includeClosedAccounts: options.includeClosedAccounts,
              }}
              onClose={options.onClose}
            />
          );

        case 'payee-autocomplete':
          return (
            <PayeeAutocompleteModal
              key={name}
              autocompleteProps={{
                value: null,
                onSelect: options.onSelect,
              }}
              onClose={options.onClose}
            />
          );

        case 'new-category':
          return (
            <SingleInputModal
              key={name}
              name={name}
              Header={props => (
                <ModalHeader
                  {...props}
                  title={
                    <ModalTitle title={t('New Category')} shrinkOnOverflow />
                  }
                />
              )}
              inputPlaceholder={t('Category name')}
              buttonText="Add"
              onValidate={options.onValidate}
              onSubmit={options.onSubmit}
            />
          );

        case 'new-category-group':
          return (
            <SingleInputModal
              key={name}
              name={name}
              Header={props => (
                <ModalHeader
                  {...props}
                  title={
                    <ModalTitle
                      title={t('New Category Group')}
                      shrinkOnOverflow
                    />
                  }
                />
              )}
              inputPlaceholder={t('Category group name')}
              buttonText={t('Add')}
              onValidate={options.onValidate}
              onSubmit={options.onSubmit}
            />
          );

        case 'envelope-budget-summary':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <EnvelopeBudgetSummaryModal
                key={name}
                month={options.month}
                onBudgetAction={options.onBudgetAction}
              />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-summary':
          return (
            <TrackingBudgetSummaryModal key={name} month={options.month} />
          );

        case 'schedule-edit':
          return (
            <ScheduleDetails
              key={name}
              id={options?.id || null}
              transaction={options?.transaction || null}
            />
          );

        case 'schedule-link':
          return (
            <ScheduleLink
              key={name}
              transactionIds={options?.transactionIds}
              getTransaction={options?.getTransaction}
              accountName={options?.accountName}
              onScheduleLinked={options?.onScheduleLinked}
            />
          );

        case 'schedules-discover':
          return <DiscoverSchedules key={name} />;

        case 'schedule-posts-offline-notification':
          return <PostsOfflineNotification key={name} />;

        case 'account-menu':
          return (
            <AccountMenuModal
              key={name}
              accountId={options.accountId}
              onSave={options.onSave}
              onEditNotes={options.onEditNotes}
              onCloseAccount={options.onCloseAccount}
              onReopenAccount={options.onReopenAccount}
              onClose={options.onClose}
            />
          );

        case 'category-menu':
          return (
            <CategoryMenuModal
              key={name}
              categoryId={options.categoryId}
              onSave={options.onSave}
              onEditNotes={options.onEditNotes}
              onDelete={options.onDelete}
              onToggleVisibility={options.onToggleVisibility}
              onClose={options.onClose}
            />
          );

        case 'envelope-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <EnvelopeBudgetMenuModal
                categoryId={options.categoryId}
                onUpdateBudget={options.onUpdateBudget}
                onCopyLastMonthAverage={options.onCopyLastMonthAverage}
                onSetMonthsAverage={options.onSetMonthsAverage}
                onApplyBudgetTemplate={options.onApplyBudgetTemplate}
              />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <TrackingBudgetMenuModal
                categoryId={options.categoryId}
                onUpdateBudget={options.onUpdateBudget}
                onCopyLastMonthAverage={options.onCopyLastMonthAverage}
                onSetMonthsAverage={options.onSetMonthsAverage}
                onApplyBudgetTemplate={options.onApplyBudgetTemplate}
              />
            </NamespaceContext.Provider>
          );

        case 'category-group-menu':
          return (
            <CategoryGroupMenuModal
              key={name}
              groupId={options.groupId}
              onSave={options.onSave}
              onAddCategory={options.onAddCategory}
              onEditNotes={options.onEditNotes}
              onSaveNotes={options.onSaveNotes}
              onDelete={options.onDelete}
              onToggleVisibility={options.onToggleVisibility}
              onClose={options.onClose}
            />
          );

        case 'notes':
          return (
            <NotesModal
              key={name}
              id={options.id}
              name={options.name}
              onSave={options.onSave}
            />
          );

        case 'envelope-balance-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <EnvelopeBalanceMenuModal
                categoryId={options.categoryId}
                onCarryover={options.onCarryover}
                onTransfer={options.onTransfer}
                onCover={options.onCover}
              />
            </NamespaceContext.Provider>
          );

        case 'envelope-summary-to-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <EnvelopeToBudgetMenuModal
                onTransfer={options.onTransfer}
                onCover={options.onCover}
                onHoldBuffer={options.onHoldBuffer}
                onResetHoldBuffer={options.onResetHoldBuffer}
              />
            </NamespaceContext.Provider>
          );

        case 'hold-buffer':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <HoldBufferModal
                month={options.month}
                onSubmit={options.onSubmit}
              />
            </NamespaceContext.Provider>
          );

        case 'tracking-balance-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <TrackingBalanceMenuModal
                categoryId={options.categoryId}
                onCarryover={options.onCarryover}
              />
            </NamespaceContext.Provider>
          );

        case 'transfer':
          return (
            <TransferModal
              key={name}
              title={options.title}
              categoryId={options.categoryId}
              month={options.month}
              amount={options.amount}
              onSubmit={options.onSubmit}
              showToBeBudgeted={options.showToBeBudgeted}
            />
          );

        case 'cover':
          return (
            <CoverModal
              key={name}
              title={options.title}
              categoryId={options.categoryId}
              month={options.month}
              showToBeBudgeted={options.showToBeBudgeted}
              onSubmit={options.onSubmit}
            />
          );

        case 'scheduled-transaction-menu':
          return (
            <ScheduledTransactionMenuModal
              key={name}
              transactionId={options.transactionId}
              onPost={options.onPost}
              onSkip={options.onSkip}
            />
          );

        case 'budget-page-menu':
          return (
            <BudgetPageMenuModal
              key={name}
              onAddCategoryGroup={options.onAddCategoryGroup}
              onToggleHiddenCategories={options.onToggleHiddenCategories}
              onSwitchBudgetFile={options.onSwitchBudgetFile}
            />
          );

        case 'envelope-budget-month-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <EnvelopeBudgetMonthMenuModal
                month={options.month}
                onBudgetAction={options.onBudgetAction}
                onEditNotes={options.onEditNotes}
              />
            </NamespaceContext.Provider>
          );

        case 'tracking-budget-month-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <TrackingBudgetMonthMenuModal
                month={options.month}
                onBudgetAction={options.onBudgetAction}
                onEditNotes={options.onEditNotes}
              />
            </NamespaceContext.Provider>
          );

        case 'budget-list':
          return <BudgetListModal key={name} />;
        case 'delete-budget':
          return <DeleteFileModal key={name} file={options.file} />;
        case 'duplicate-budget':
          return (
            <DuplicateFileModal
              key={name}
              file={options.file}
              managePage={options?.managePage}
              loadBudget={options?.loadBudget}
              onComplete={options?.onComplete}
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
              currentBudgetDirectory={options.currentBudgetDirectory}
              newDirectory={options.newDirectory}
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
