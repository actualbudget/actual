import React from 'react';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';

import Component from '@reactions/component';
import { createLocation } from 'history';
import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { send, listen, unlisten } from 'loot-core/src/platform/client/fetch';

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
  const isNewAutocompleteEnabled = useFeatureFlag('newAutocomplete');
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
      <Switch key={name} location={location}>
        <Route path="/import-transactions">
          <ImportTransactions modalProps={modalProps} options={options} />
        </Route>

        <Route path="/add-account">
          <CreateAccount
            modalProps={modalProps}
            actions={actions}
            syncServerStatus={syncServerStatus}
          />
        </Route>

        <Route path="/add-local-account">
          <CreateLocalAccount
            modalProps={modalProps}
            actions={actions}
            history={history}
          />
        </Route>

        <Route path="/close-account">
          <CloseAccount
            modalProps={modalProps}
            account={options.account}
            balance={options.balance}
            canDelete={options.canDelete}
            accounts={accounts.filter(acct => acct.closed === 0)}
            categoryGroups={categoryGroups}
            actions={actions}
          />
        </Route>

        <Route path="/select-linked-accounts">
          <SelectLinkedAccounts
            modalProps={modalProps}
            externalAccounts={options.accounts}
            requisitionId={options.requisitionId}
            localAccounts={accounts.filter(acct => acct.closed === 0)}
            upgradingAccountId={options.upgradingAccountId}
            actions={actions}
          />
        </Route>

        <Route path="/configure-linked-accounts">
          <ConfigureLinkedAccounts
            modalProps={modalProps}
            institution={options.institution}
            publicToken={options.publicToken}
            accounts={options.accounts}
            upgradingId={options.upgradingId}
            actions={actions}
          />
        </Route>

        <Route
          path="/confirm-category-delete"
          render={() => {
            const { category, group, onDelete } = options;
            return (
              <ConfirmCategoryDelete
                modalProps={modalProps}
                actions={actions}
                category={categories.find(c => c.id === category)}
                group={categoryGroups.find(g => g.id === group)}
                categoryGroups={categoryGroups}
                onDelete={onDelete}
              />
            );
          }}
        />

        <Route
          path="/load-backup"
          render={() => {
            return (
              <Component
                initialState={{ backups: [] }}
                didMount={async ({ setState }) => {
                  setState({
                    backups: await send('backups-get', { id: budgetId }),
                  });

                  listen('backups-updated', backups => {
                    setState({ backups });
                  });
                }}
                willUnmount={() => {
                  unlisten('backups-updated');
                }}
              >
                {({ state }) => (
                  <LoadBackup
                    budgetId={budgetId}
                    modalProps={modalProps}
                    actions={actions}
                    backups={state.backups}
                  />
                )}
              </Component>
            );
          }}
        />

        <Route
          path="/manage-rules"
          render={() => {
            return (
              <ManageRulesModal
                history={history}
                modalProps={modalProps}
                payeeId={options.payeeId}
              />
            );
          }}
        />

        <Route
          path="/edit-rule"
          render={() => {
            return (
              <EditRule
                history={history}
                modalProps={modalProps}
                defaultRule={options.rule}
                onSave={options.onSave}
              />
            );
          }}
        />

        <Route
          path="/merge-unused-payees"
          render={() => {
            return (
              <MergeUnusedPayees
                history={history}
                modalProps={modalProps}
                payeeIds={options.payeeIds}
                targetPayeeId={options.targetPayeeId}
              />
            );
          }}
        />

        <Route
          path="/plaid-external-msg"
          render={() => {
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
          }}
        />
        <Route
          path="/nordigen-external-msg"
          render={() => {
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
          }}
        />

        <Route
          path="/create-encryption-key"
          render={() => {
            return (
              <CreateEncryptionKey
                key={name}
                modalProps={modalProps}
                actions={actions}
                options={options}
              />
            );
          }}
        />

        <Route
          path="/fix-encryption-key"
          render={() => {
            return (
              <FixEncryptionKey
                key={name}
                modalProps={modalProps}
                actions={actions}
                options={options}
              />
            );
          }}
        />

        <Route
          path="/edit-field"
          render={() => {
            return (
              <EditField
                key={name}
                modalProps={modalProps}
                actions={actions}
                name={options.name}
                onSubmit={options.onSubmit}
                isNewAutocompleteEnabled={isNewAutocompleteEnabled}
              />
            );
          }}
        />

        <Route path="/budget-summary">
          <BudgetSummary
            key={name}
            modalProps={modalProps}
            month={options.month}
            actions={actions}
            isNewAutocompleteEnabled={isNewAutocompleteEnabled}
            isGoalTemplatesEnabled={isGoalTemplatesEnabled}
          />
        </Route>
      </Switch>
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
