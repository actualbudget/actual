// @ts-strict-ignore
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { type State } from 'loot-core/src/client/state-types';
import { type PopModalAction } from 'loot-core/src/client/state-types/modals';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';

import { useActions } from '../hooks/useActions';
import { useSyncServerStatus } from '../hooks/useSyncServerStatus';

import { ModalTitle } from './common/Modal';
import { AccountAutocompleteModal } from './modals/AccountAutocompleteModal';
import { AccountMenuModal } from './modals/AccountMenuModal';
import { BudgetListModal } from './modals/BudgetListModal';
import { BudgetPageMenuModal } from './modals/BudgetPageMenuModal';
import { CategoryAutocompleteModal } from './modals/CategoryAutocompleteModal';
import { CategoryGroupMenuModal } from './modals/CategoryGroupMenuModal';
import { CategoryMenuModal } from './modals/CategoryMenuModal';
import { CloseAccountModal } from './modals/CloseAccountModal';
import { ConfirmCategoryDelete } from './modals/ConfirmCategoryDelete';
import { ConfirmTransactionEdit } from './modals/ConfirmTransactionEdit';
import { ConfirmUnlinkAccount } from './modals/ConfirmUnlinkAccount';
import { CoverModal } from './modals/CoverModal';
import { CreateAccountModal } from './modals/CreateAccountModal';
import { CreateEncryptionKeyModal } from './modals/CreateEncryptionKeyModal';
import { CreateLocalAccountModal } from './modals/CreateLocalAccountModal';
import { EditField } from './modals/EditField';
import { EditRule } from './modals/EditRule';
import { FixEncryptionKeyModal } from './modals/FixEncryptionKeyModal';
import { GoCardlessExternalMsg } from './modals/GoCardlessExternalMsg';
import { GoCardlessInitialise } from './modals/GoCardlessInitialise';
import { HoldBufferModal } from './modals/HoldBufferModal';
import { ImportTransactions } from './modals/ImportTransactions';
import { LoadBackup } from './modals/LoadBackup';
import { ManageRulesModal } from './modals/ManageRulesModal';
import { MergeUnusedPayees } from './modals/MergeUnusedPayees';
import { NotesModal } from './modals/NotesModal';
import { PayeeAutocompleteModal } from './modals/PayeeAutocompleteModal';
import { ReportBalanceMenuModal } from './modals/ReportBalanceMenuModal';
import { ReportBudgetMenuModal } from './modals/ReportBudgetMenuModal';
import { ReportBudgetMonthMenuModal } from './modals/ReportBudgetMonthMenuModal';
import { ReportBudgetSummaryModal } from './modals/ReportBudgetSummaryModal';
import { RolloverBalanceMenuModal } from './modals/RolloverBalanceMenuModal';
import { RolloverBudgetMenuModal } from './modals/RolloverBudgetMenuModal';
import { RolloverBudgetMonthMenuModal } from './modals/RolloverBudgetMonthMenuModal';
import { RolloverBudgetSummaryModal } from './modals/RolloverBudgetSummaryModal';
import { RolloverToBudgetMenuModal } from './modals/RolloverToBudgetMenuModal';
import { ScheduledTransactionMenuModal } from './modals/ScheduledTransactionMenuModal';
import { SelectLinkedAccounts } from './modals/SelectLinkedAccounts';
import { SimpleFinInitialise } from './modals/SimpleFinInitialise';
import { SingleInputModal } from './modals/SingleInputModal';
import { SwitchBudgetTypeModal } from './modals/SwitchBudgetTypeModal';
import { TransferModal } from './modals/TransferModal';
import { DiscoverSchedules } from './schedules/DiscoverSchedules';
import { PostsOfflineNotification } from './schedules/PostsOfflineNotification';
import { ScheduleDetails } from './schedules/ScheduleDetails';
import { ScheduleLink } from './schedules/ScheduleLink';
import { NamespaceContext } from './spreadsheet/NamespaceContext';

export type CommonModalProps = {
  onClose: () => PopModalAction;
  onBack: () => PopModalAction;
  showBack: boolean;
  isCurrent: boolean;
  isHidden: boolean;
  stackIndex: number;
};

export function Modals() {
  const modalStack = useSelector((state: State) => state.modals.modalStack);
  const isHidden = useSelector((state: State) => state.modals.isHidden);
  const actions = useActions();
  const location = useLocation();

  useEffect(() => {
    if (modalStack.length > 0) {
      actions.closeModal();
    }
  }, [location]);

  const syncServerStatus = useSyncServerStatus();

  const modals = modalStack
    .map(({ name, options }, idx) => {
      const modalProps: CommonModalProps = {
        onClose: actions.popModal,
        onBack: actions.popModal,
        showBack: idx > 0,
        isCurrent: idx === modalStack.length - 1,
        isHidden,
        stackIndex: idx,
      };

      switch (name) {
        case 'import-transactions':
          return (
            <ImportTransactions
              key={name}
              modalProps={modalProps}
              options={options}
            />
          );

        case 'add-account':
          return (
            <CreateAccountModal
              key={name}
              modalProps={modalProps}
              syncServerStatus={syncServerStatus}
              upgradingAccountId={options?.upgradingAccountId}
            />
          );

        case 'add-local-account':
          return (
            <CreateLocalAccountModal
              key={name}
              modalProps={modalProps}
              actions={actions}
            />
          );

        case 'close-account':
          return (
            <CloseAccountModal
              key={name}
              modalProps={modalProps}
              account={options.account}
              balance={options.balance}
              canDelete={options.canDelete}
            />
          );

        case 'select-linked-accounts':
          return (
            <SelectLinkedAccounts
              key={name}
              modalProps={modalProps}
              externalAccounts={options.accounts}
              requisitionId={options.requisitionId}
              actions={actions}
              syncSource={options.syncSource}
            />
          );

        case 'confirm-category-delete':
          return (
            <ConfirmCategoryDelete
              key={name}
              modalProps={modalProps}
              category={options.category}
              group={options.group}
              onDelete={options.onDelete}
            />
          );

        case 'confirm-unlink-account':
          return (
            <ConfirmUnlinkAccount
              key={name}
              modalProps={modalProps}
              accountName={options.accountName}
              onUnlink={options.onUnlink}
            />
          );

        case 'confirm-transaction-edit':
          return (
            <ConfirmTransactionEdit
              key={name}
              modalProps={modalProps}
              onConfirm={options.onConfirm}
              confirmReason={options.confirmReason}
            />
          );

        case 'load-backup':
          return (
            <LoadBackup
              key={name}
              watchUpdates
              budgetId={options.budgetId}
              modalProps={modalProps}
              actions={actions}
              backupDisabled={false}
            />
          );

        case 'manage-rules':
          return (
            <ManageRulesModal
              key={name}
              modalProps={modalProps}
              payeeId={options?.payeeId}
            />
          );

        case 'edit-rule':
          return (
            <EditRule
              key={name}
              modalProps={modalProps}
              defaultRule={options.rule}
              onSave={options.onSave}
            />
          );

        case 'merge-unused-payees':
          return (
            <MergeUnusedPayees
              key={name}
              modalProps={modalProps}
              payeeIds={options.payeeIds}
              targetPayeeId={options.targetPayeeId}
            />
          );

        case 'gocardless-init':
          return (
            <GoCardlessInitialise
              key={name}
              modalProps={modalProps}
              onSuccess={options.onSuccess}
            />
          );

        case 'simplefin-init':
          return (
            <SimpleFinInitialise
              key={name}
              modalProps={modalProps}
              onSuccess={options.onSuccess}
            />
          );

        case 'gocardless-external-msg':
          return (
            <GoCardlessExternalMsg
              key={name}
              modalProps={modalProps}
              onMoveExternal={options.onMoveExternal}
              onClose={() => {
                options.onClose?.();
                send('gocardless-poll-web-token-stop');
              }}
              onSuccess={options.onSuccess}
            />
          );

        case 'create-encryption-key':
          return (
            <CreateEncryptionKeyModal
              key={name}
              modalProps={modalProps}
              options={options}
            />
          );

        case 'fix-encryption-key':
          return (
            <FixEncryptionKeyModal
              key={name}
              modalProps={modalProps}
              options={options}
            />
          );

        case 'edit-field':
          return (
            <EditField
              key={name}
              modalProps={modalProps}
              name={options.name}
              onSubmit={options.onSubmit}
              onClose={options.onClose}
            />
          );

        case 'category-autocomplete':
          return (
            <CategoryAutocompleteModal
              key={name}
              modalProps={modalProps}
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
              modalProps={modalProps}
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
              modalProps={modalProps}
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
              modalProps={modalProps}
              title={<ModalTitle title="New Category" shrinkOnOverflow />}
              inputPlaceholder="Category name"
              buttonText="Add"
              onValidate={options.onValidate}
              onSubmit={options.onSubmit}
            />
          );

        case 'new-category-group':
          return (
            <SingleInputModal
              key={name}
              modalProps={modalProps}
              title={<ModalTitle title="New Category Group" shrinkOnOverflow />}
              inputPlaceholder="Category group name"
              buttonText="Add"
              onValidate={options.onValidate}
              onSubmit={options.onSubmit}
            />
          );

        case 'rollover-budget-summary':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <RolloverBudgetSummaryModal
                key={name}
                modalProps={modalProps}
                month={options.month}
                onBudgetAction={options.onBudgetAction}
              />
            </NamespaceContext.Provider>
          );

        case 'report-budget-summary':
          return (
            <ReportBudgetSummaryModal
              key={name}
              modalProps={modalProps}
              month={options.month}
            />
          );

        case 'schedule-edit':
          return (
            <ScheduleDetails
              key={name}
              modalProps={modalProps}
              id={options?.id || null}
              actions={actions}
              transaction={options?.transaction || null}
            />
          );

        case 'schedule-link':
          return (
            <ScheduleLink
              key={name}
              modalProps={modalProps}
              actions={actions}
              transactionIds={options?.transactionIds}
              getTransaction={options?.getTransaction}
              pushModal={options?.pushModal}
            />
          );

        case 'schedules-discover':
          return (
            <DiscoverSchedules
              key={name}
              modalProps={modalProps}
              actions={actions}
            />
          );

        case 'schedule-posts-offline-notification':
          return (
            <PostsOfflineNotification
              key={name}
              modalProps={modalProps}
              actions={actions}
            />
          );

        case 'switch-budget-type':
          return (
            <SwitchBudgetTypeModal
              key={name}
              modalProps={modalProps}
              onSwitch={options.onSwitch}
            />
          );

        case 'account-menu':
          return (
            <AccountMenuModal
              key={name}
              modalProps={modalProps}
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
              modalProps={modalProps}
              categoryId={options.categoryId}
              onSave={options.onSave}
              onEditNotes={options.onEditNotes}
              onDelete={options.onDelete}
              onClose={options.onClose}
            />
          );

        case 'rollover-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <RolloverBudgetMenuModal
                modalProps={modalProps}
                categoryId={options.categoryId}
                onUpdateBudget={options.onUpdateBudget}
                onCopyLastMonthAverage={options.onCopyLastMonthAverage}
                onSetMonthsAverage={options.onSetMonthsAverage}
                onApplyBudgetTemplate={options.onApplyBudgetTemplate}
              />
            </NamespaceContext.Provider>
          );

        case 'report-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <ReportBudgetMenuModal
                modalProps={modalProps}
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
              modalProps={modalProps}
              groupId={options.groupId}
              onSave={options.onSave}
              onAddCategory={options.onAddCategory}
              onEditNotes={options.onEditNotes}
              onSaveNotes={options.onSaveNotes}
              onDelete={options.onDelete}
              onClose={options.onClose}
            />
          );

        case 'notes':
          return (
            <NotesModal
              key={name}
              modalProps={modalProps}
              id={options.id}
              name={options.name}
              onSave={options.onSave}
            />
          );

        case 'rollover-balance-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <RolloverBalanceMenuModal
                modalProps={modalProps}
                categoryId={options.categoryId}
                onCarryover={options.onCarryover}
                onTransfer={options.onTransfer}
                onCover={options.onCover}
              />
            </NamespaceContext.Provider>
          );

        case 'rollover-summary-to-budget-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <RolloverToBudgetMenuModal
                modalProps={modalProps}
                onTransfer={options.onTransfer}
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
                modalProps={modalProps}
                month={options.month}
                onSubmit={options.onSubmit}
              />
            </NamespaceContext.Provider>
          );

        case 'report-balance-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <ReportBalanceMenuModal
                modalProps={modalProps}
                categoryId={options.categoryId}
                onCarryover={options.onCarryover}
              />
            </NamespaceContext.Provider>
          );

        case 'transfer':
          return (
            <TransferModal
              key={name}
              modalProps={modalProps}
              title={options.title}
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
              modalProps={modalProps}
              categoryId={options.categoryId}
              month={options.month}
              onSubmit={options.onSubmit}
            />
          );

        case 'scheduled-transaction-menu':
          return (
            <ScheduledTransactionMenuModal
              key={name}
              modalProps={modalProps}
              transactionId={options.transactionId}
              onPost={options.onPost}
              onSkip={options.onSkip}
            />
          );

        case 'budget-page-menu':
          return (
            <BudgetPageMenuModal
              key={name}
              modalProps={modalProps}
              onAddCategoryGroup={options.onAddCategoryGroup}
              onToggleHiddenCategories={options.onToggleHiddenCategories}
              onSwitchBudgetFile={options.onSwitchBudgetFile}
              onSwitchBudgetType={options.onSwitchBudgetType}
            />
          );

        case 'rollover-budget-month-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <RolloverBudgetMonthMenuModal
                modalProps={modalProps}
                month={options.month}
                onBudgetAction={options.onBudgetAction}
                onEditNotes={options.onEditNotes}
              />
            </NamespaceContext.Provider>
          );

        case 'report-budget-month-menu':
          return (
            <NamespaceContext.Provider
              key={name}
              value={monthUtils.sheetForMonth(options.month)}
            >
              <ReportBudgetMonthMenuModal
                modalProps={modalProps}
                month={options.month}
                onBudgetAction={options.onBudgetAction}
                onEditNotes={options.onEditNotes}
              />
            </NamespaceContext.Provider>
          );

        case 'budget-list':
          return <BudgetListModal key={name} modalProps={modalProps} />;

        default:
          console.error('Unknown modal:', name);
          return null;
      }
    })
    .map((modal, idx) => (
      <React.Fragment key={modalStack[idx].name}>{modal}</React.Fragment>
    ));

  // fragment needed per TS types
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{modals}</>;
}
