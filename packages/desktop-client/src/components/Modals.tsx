import React from 'react';
import { useSelector } from 'react-redux';

import { send } from 'loot-core/src/platform/client/fetch';

import { useActions } from '../hooks/useActions';
import useSyncServerStatus from '../hooks/useSyncServerStatus';

import BudgetSummary from './modals/BudgetSummary';
import CloseAccount from './modals/CloseAccount';
import ConfirmCategoryDelete from './modals/ConfirmCategoryDelete';
import CreateAccount from './modals/CreateAccount';
import CreateEncryptionKey from './modals/CreateEncryptionKey';
import CreateLocalAccount from './modals/CreateLocalAccount';
import EditField from './modals/EditField';
import EditRule from './modals/EditRule';
import FixEncryptionKey from './modals/FixEncryptionKey';
import ImportTransactions from './modals/ImportTransactions';
import LoadBackup from './modals/LoadBackup';
import ManageRulesModal from './modals/ManageRulesModal';
import MergeUnusedPayees from './modals/MergeUnusedPayees';
import GoCardlessExternalMsg from './modals/GoCardlessExternalMsg';
import GoCardlessInitialise from './modals/GoCardlessInitialise';
import PlaidExternalMsg from './modals/PlaidExternalMsg';
import SelectLinkedAccounts from './modals/SelectLinkedAccounts';

export default function Modals() {
  const modalStack = useSelector(state => state.modals.modalStack);
  const isHidden = useSelector(state => state.modals.isHidden);
  const accounts = useSelector(state => state.queries.accounts);
  const categoryGroups = useSelector(state => state.queries.categories.grouped);
  const categories = useSelector(state => state.queries.categories.list);
  const budgetId = useSelector(
    state => state.prefs.local && state.prefs.local.id,
  );
  const actions = useActions();

  const syncServerStatus = useSyncServerStatus();

  return modalStack
    .map(({ name, options }, idx) => {
      const modalProps = {
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
              accounts={accounts.filter(acct => acct.closed === 0)}
              categoryGroups={categoryGroups}
              actions={actions}
            />
          );

        case 'select-linked-accounts':
          return (
            <SelectLinkedAccounts
              modalProps={modalProps}
              externalAccounts={options.accounts}
              requisitionId={options.requisitionId}
              localAccounts={accounts.filter(acct => acct.closed === 0)}
              actions={actions}
            />
          );

        case 'confirm-category-delete':
          return (
            <ConfirmCategoryDelete
              modalProps={modalProps}
              category={
                'category' in options &&
                categories.find(c => c.id === options.category)
              }
              group={
                'group' in options &&
                categoryGroups.find(g => g.id === options.group)
              }
              categoryGroups={categoryGroups}
              onDelete={options.onDelete}
            />
          );

        case 'load-backup':
          return (
            <LoadBackup
              watchUpdates
              budgetId={budgetId}
              modalProps={modalProps}
              actions={actions}
              backupDisabled={false}
            />
          );

        case 'manage-rules':
          return (
            <ManageRulesModal
              modalProps={modalProps}
              payeeId={options.payeeId}
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
              actions={actions}
              name={options.name}
              onSubmit={options.onSubmit}
            />
          );

        case 'budget-summary':
          return (
            <BudgetSummary
              key={name}
              modalProps={modalProps}
              month={options.month}
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
}
