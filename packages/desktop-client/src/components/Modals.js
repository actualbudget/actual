import React from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';

import useFeatureFlag from '../hooks/useFeatureFlag';
import useSyncServerStatus from '../hooks/useSyncServerStatus';

import BudgetSummary from './modals/BudgetSummary';
import CloseAccount from './modals/CloseAccount';
import ConfigureLinkedAccounts from './modals/ConfigureLinkedAccounts';
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
import NordigenExternalMsg from './modals/NordigenExternalMsg';
import NordigenInitialise from './modals/NordigenInitialise';
import PlaidExternalMsg from './modals/PlaidExternalMsg';
import SelectLinkedAccounts from './modals/SelectLinkedAccounts';

function Modals({
  modalStack,
  isHidden,
  accounts,
  categoryGroups,
  categories,
  budgetId,
  actions,
}) {
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');

  const syncServerStatus = useSyncServerStatus();

  return modalStack
    .map(({ name, options = {} }, idx) => {
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
              actions={actions}
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
              upgradingAccountId={options.upgradingAccountId}
              actions={actions}
            />
          );

        case 'configure-linked-accounts':
          return (
            <ConfigureLinkedAccounts
              modalProps={modalProps}
              institution={options.institution}
              publicToken={options.publicToken}
              accounts={options.accounts}
              upgradingId={options.upgradingId}
              actions={actions}
            />
          );

        case 'confirm-category-delete':
          return (
            <ConfirmCategoryDelete
              modalProps={modalProps}
              actions={actions}
              category={categories.find(c => c.id === options.category)}
              group={categoryGroups.find(g => g.id === options.group)}
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
              actions={actions}
              onMoveExternal={options.onMoveExternal}
              onClose={() => {
                options.onClose && options.onClose();
                send('poll-web-token-stop');
              }}
              onSuccess={options.onSuccess}
            />
          );

        case 'nordigen-init':
          return (
            <NordigenInitialise
              modalProps={modalProps}
              onSuccess={options.onSuccess}
            />
          );

        case 'nordigen-external-msg':
          return (
            <NordigenExternalMsg
              modalProps={modalProps}
              actions={actions}
              onMoveExternal={options.onMoveExternal}
              onClose={() => {
                options.onClose && options.onClose();
                send('nordigen-poll-web-token-stop');
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
              actions={actions}
              isGoalTemplatesEnabled={isGoalTemplatesEnabled}
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

export default connect(
  state => ({
    modalStack: state.modals.modalStack,
    isHidden: state.modals.isHidden,
    accounts: state.queries.accounts,
    categoryGroups: state.queries.categories.grouped,
    categories: state.queries.categories.list,
    budgetId: state.prefs.local && state.prefs.local.id,
  }),
  dispatch => ({ actions: bindActionCreators(actions, dispatch) }),
)(Modals);
