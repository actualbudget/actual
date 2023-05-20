import React from 'react';
import { connect } from 'react-redux';
import { Route, Routes } from 'react-router-dom';

import { createLocation } from 'history';
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
  history,
  modalStack,
  isHidden,
  accounts,
  categoryGroups,
  categories,
  payees,
  budgetId,
  actions,
}) {
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');

  const syncServerStatus = useSyncServerStatus();

  return modalStack.map(({ name, options = {} }, idx) => {
    const modalProps = {
      onClose: actions.popModal,
      onBack: actions.popModal,
      showBack: idx > 0,
      isCurrent: idx === modalStack.length - 1,
      isHidden,
      stackIndex: idx,
    };

    let location = createLocation('/' + name);
    return (
      <Routes key={name} location={location}>
        <Route
          path="/import-transactions"
          element={
            <ImportTransactions modalProps={modalProps} options={options} />
          }
        />

        <Route
          path="/add-account"
          element={
            <CreateAccount
              modalProps={modalProps}
              actions={actions}
              syncServerStatus={syncServerStatus}
            />
          }
        />

        <Route
          path="/add-local-account"
          element={
            <CreateLocalAccount
              modalProps={modalProps}
              actions={actions}
              history={history}
            />
          }
        />

        <Route
          path="/close-account"
          element={
            <CloseAccount
              modalProps={modalProps}
              account={options.account}
              balance={options.balance}
              canDelete={options.canDelete}
              accounts={accounts.filter(acct => acct.closed === 0)}
              categoryGroups={categoryGroups}
              actions={actions}
            />
          }
        />

        <Route
          path="/select-linked-accounts"
          element={
            <SelectLinkedAccounts
              modalProps={modalProps}
              externalAccounts={options.accounts}
              requisitionId={options.requisitionId}
              localAccounts={accounts.filter(acct => acct.closed === 0)}
              upgradingAccountId={options.upgradingAccountId}
              actions={actions}
            />
          }
        />

        <Route
          path="/configure-linked-accounts"
          element={
            <ConfigureLinkedAccounts
              modalProps={modalProps}
              institution={options.institution}
              publicToken={options.publicToken}
              accounts={options.accounts}
              upgradingId={options.upgradingId}
              actions={actions}
            />
          }
        />

        <Route
          path="/confirm-category-delete"
          element={
            <ConfirmCategoryDelete
              modalProps={modalProps}
              actions={actions}
              category={categories.find(c => c.id === options.category)}
              group={categoryGroups.find(g => g.id === options.group)}
              categoryGroups={categoryGroups}
              onDelete={options.onDelete}
            />
          }
        />

        <Route
          path="/load-backup"
          element={
            <LoadBackup
              watchUpdates
              budgetId={budgetId}
              modalProps={modalProps}
              actions={actions}
            />
          }
        />

        <Route
          path="/manage-rules"
          element={
            <ManageRulesModal
              history={history}
              modalProps={modalProps}
              payeeId={options.payeeId}
            />
          }
        />

        <Route
          path="/edit-rule"
          element={
            <EditRule
              history={history}
              modalProps={modalProps}
              defaultRule={options.rule}
              onSave={options.onSave}
            />
          }
        />

        <Route
          path="/merge-unused-payees"
          element={
            <MergeUnusedPayees
              history={history}
              modalProps={modalProps}
              payeeIds={options.payeeIds}
              targetPayeeId={options.targetPayeeId}
            />
          }
        />

        <Route
          path="/plaid-external-msg"
          element={
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
          }
        />
        <Route
          path="/nordigen-init"
          element={
            <NordigenInitialise
              modalProps={modalProps}
              onSuccess={options.onSuccess}
            />
          }
        />
        <Route
          path="/nordigen-external-msg"
          element={
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
          }
        />

        <Route
          path="/create-encryption-key"
          element={
            <CreateEncryptionKey
              key={name}
              modalProps={modalProps}
              actions={actions}
              options={options}
            />
          }
        />

        <Route
          path="/fix-encryption-key"
          element={
            <FixEncryptionKey
              key={name}
              modalProps={modalProps}
              actions={actions}
              options={options}
            />
          }
        />

        <Route
          path="/edit-field"
          element={
            <EditField
              key={name}
              modalProps={modalProps}
              actions={actions}
              name={options.name}
              onSubmit={options.onSubmit}
            />
          }
        />

        <Route
          path="/budget-summary"
          element={
            <BudgetSummary
              key={name}
              modalProps={modalProps}
              month={options.month}
              actions={actions}
              isGoalTemplatesEnabled={isGoalTemplatesEnabled}
            />
          }
        />
      </Routes>
    );
  });
}

export default connect(
  state => ({
    modalStack: state.modals.modalStack,
    isHidden: state.modals.isHidden,
    accounts: state.queries.accounts,
    categoryGroups: state.queries.categories.grouped,
    categories: state.queries.categories.list,
    payees: state.queries.payees,
    budgetId: state.prefs.local && state.prefs.local.id,
  }),
  dispatch => ({ actions: bindActionCreators(actions, dispatch) }),
)(Modals);
