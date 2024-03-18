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

import { AccountAutocompleteModal } from './modals/AccountAutocompleteModal';
import { CategoryAutocompleteModal } from './modals/CategoryAutocompleteModal';
import { CategoryGroupMenuModal } from './modals/CategoryGroupMenuModal';
import { CategoryMenuModal } from './modals/CategoryMenuModal';
import { CloseAccount } from './modals/CloseAccount';
import { ConfirmCategoryDelete } from './modals/ConfirmCategoryDelete';
import { ConfirmTransactionEdit } from './modals/ConfirmTransactionEdit';
import { ConfirmUnlinkAccount } from './modals/ConfirmUnlinkAccount';
import { CoverModal } from './modals/CoverModal';
import { CreateAccount } from './modals/CreateAccount';
import { CreateEncryptionKey } from './modals/CreateEncryptionKey';
import { CreateLocalAccount } from './modals/CreateLocalAccount';
import { EditField } from './modals/EditField';
import { EditRule } from './modals/EditRule';
import { FixEncryptionKey } from './modals/FixEncryptionKey';
import { GoCardlessExternalMsg } from './modals/GoCardlessExternalMsg';
import { GoCardlessInitialise } from './modals/GoCardlessInitialise';
import { ImportTransactions } from './modals/ImportTransactions';
import { LoadBackup } from './modals/LoadBackup';
import { ManageRulesModal } from './modals/ManageRulesModal';
import { MergeUnusedPayees } from './modals/MergeUnusedPayees';
import { Notes } from './modals/Notes';
import { PayeeAutocompleteModal } from './modals/PayeeAutocompleteModal';
import { PlaidExternalMsg } from './modals/PlaidExternalMsg';
import { ReportBalanceMenuModal } from './modals/ReportBalanceMenuModal';
import { ReportBudgetSummary } from './modals/ReportBudgetSummary';
import { RolloverBalanceMenuModal } from './modals/RolloverBalanceMenuModal';
import { RolloverBudgetSummary } from './modals/RolloverBudgetSummary';
import { ScheduledTransactionMenuModal } from './modals/ScheduledTransactionMenuModal';
import { SelectLinkedAccounts } from './modals/SelectLinkedAccounts';
import { SimpleFinInitialise } from './modals/SimpleFinInitialise';
import { SingleInput } from './modals/SingleInput';
import { SwitchBudgetType } from './modals/SwitchBudgetType';
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
            <ImportTransactions modalProps={modalProps} options={options} />
          );

        case 'add-account':
          return (
            <CreateAccount
              modalProps={modalProps}
              syncServerStatus={syncServerStatus}
              upgradingAccountId={options?.upgradingAccountId}
            />
          );

        case 'add-local-account':
          return (
            <CreateLocalAccount modalProps={modalProps} actions={actions} />
          );

        case 'close-account':
          return (
            <CloseAccount
              modalProps={modalProps}
              account={options.account}
              balance={options.balance}
              canDelete={options.canDelete}
              actions={actions}
            />
          );

        case 'select-linked-accounts':
          return (
            <SelectLinkedAccounts
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
              modalProps={modalProps}
              category={options.category}
              group={options.group}
              onDelete={options.onDelete}
            />
          );

        case 'confirm-unlink-account':
          return (
            <ConfirmUnlinkAccount
              modalProps={modalProps}
              accountName={options.accountName}
              onUnlink={options.onUnlink}
            />
          );

        case 'confirm-transaction-edit':
          return (
            <ConfirmTransactionEdit
              modalProps={modalProps}
              onConfirm={options.onConfirm}
              confirmReason={options.confirmReason}
            />
          );

        case 'load-backup':
          return (
            <LoadBackup
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
              modalProps={modalProps}
              payeeId={options?.payeeId}
            />
          );

        case 'edit-rule':
          return (
            <EditRule
              modalProps={modalProps}
              defaultRule={options.rule}
              onSave={options.onSave}
            />
          );

        case 'merge-unused-payees':
          return (
            <MergeUnusedPayees
              modalProps={modalProps}
              payeeIds={options.payeeIds}
              targetPayeeId={options.targetPayeeId}
            />
          );

        case 'plaid-external-msg':
          return (
            <PlaidExternalMsg
              modalProps={modalProps}
              onMoveExternal={options.onMoveExternal}
              onClose={() => {
                options.onClose?.();
                send('poll-web-token-stop');
              }}
              onSuccess={options.onSuccess}
            />
          );

        case 'gocardless-init':
          return (
            <GoCardlessInitialise
              modalProps={modalProps}
              onSuccess={options.onSuccess}
            />
          );

        case 'simplefin-init':
          return (
            <SimpleFinInitialise
              modalProps={modalProps}
              onSuccess={options.onSuccess}
            />
          );

        case 'gocardless-external-msg':
          return (
            <GoCardlessExternalMsg
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
            <CreateEncryptionKey
              key={name}
              modalProps={modalProps}
              actions={actions}
              options={options}
            />
          );

        case 'fix-encryption-key':
          return (
            <FixEncryptionKey
              key={name}
              modalProps={modalProps}
              actions={actions}
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
                categoryGroups: options.categoryGroups,
                onSelect: options.onSelect,
                showHiddenCategories: options.showHiddenCategories,
              }}
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
            <SingleInput
              modalProps={modalProps}
              title="New Category"
              inputPlaceholder="Category name"
              buttonText="Add"
              onValidate={options.onValidate}
              onSubmit={options.onSubmit}
            />
          );

        case 'new-category-group':
          return (
            <SingleInput
              modalProps={modalProps}
              title="New Category Group"
              inputPlaceholder="Category group name"
              buttonText="Add"
              onValidate={options.onValidate}
              onSubmit={options.onSubmit}
            />
          );

        case 'rollover-budget-summary':
          return (
            <RolloverBudgetSummary
              key={name}
              modalProps={modalProps}
              month={options.month}
              onBudgetAction={options.onBudgetAction}
            />
          );

        case 'report-budget-summary':
          return (
            <ReportBudgetSummary
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
            <SwitchBudgetType
              key={name}
              modalProps={modalProps}
              onSwitch={options?.onSwitch}
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
            <Notes
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
              modalProps={modalProps}
              categoryId={options.categoryId}
              amount={options.amount}
              onSubmit={options.onSubmit}
              showToBeBudgeted={options.showToBeBudgeted}
            />
          );

        case 'cover':
          return (
            <CoverModal
              modalProps={modalProps}
              categoryId={options.categoryId}
              onSubmit={options.onSubmit}
            />
          );

        case 'scheduled-transaction-menu':
          return (
            <ScheduledTransactionMenuModal
              modalProps={modalProps}
              transactionId={options.transactionId}
              onPost={options.onPost}
              onSkip={options.onSkip}
            />
          );

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
