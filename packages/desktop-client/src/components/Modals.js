import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import { createLocation } from 'history';
import Component from '@reactions/component';
import * as actions from '@actual-app/loot-core/src/client/actions';
import { send, listen, unlisten } from '@actual-app/loot-core/src/platform/client/fetch';
import { getModalRoute } from '../util';

import CreateAccount from './modals/CreateAccount';
import CreateLocalAccount from '@actual-app/loot-design/src/components/modals/CreateLocalAccount';
import CloseAccount from '@actual-app/loot-design/src/components/modals/CloseAccount';
import SelectLinkedAccounts from '@actual-app/loot-design/src/components/modals/SelectLinkedAccounts';
import ConfigureLinkedAccounts from '@actual-app/loot-design/src/components/modals/ConfigureLinkedAccounts';
import LoadBackup from '@actual-app/loot-design/src/components/modals/LoadBackup';
import ManagePayeesWithData from './payees/ManagePayeesWithData';
import ManageRules from './modals/ManageRules';
import EditRule from './modals/EditRule';
import MergeUnusedPayees from './modals/MergeUnusedPayees';
import PlaidExternalMsg from '@actual-app/loot-design/src/components/modals/PlaidExternalMsg';
import ConfirmCategoryDelete from './modals/ConfirmCategoryDelete';
import WelcomeScreen from './modals/WelcomeScreen';
import ImportTransactions from '@actual-app/loot-design/src/components/modals/ImportTransactions';
import CreateEncryptionKey from './modals/CreateEncryptionKey';
import FixEncryptionKey from './modals/FixEncryptionKey';
import EditField from '@actual-app/loot-design/src/components/modals/EditField';

function Modals({
  history,
  modalStack,
  isHidden,
  accounts,
  categoryGroups,
  categories,
  payees,
  budgetId,
  actions
}) {
  return modalStack.map(({ name, options = {} }, idx) => {
    const modalProps = {
      onClose: actions.popModal,
      onBack: actions.popModal,
      showBack: idx > 0,
      isCurrent: idx === modalStack.length - 1,
      isHidden,
      stackIndex: idx
    };

    let location = createLocation('/' + name);
    return (
      <Switch key={name} location={location}>
        <Route path="/import-transactions">
          <ImportTransactions modalProps={modalProps} options={options} />
        </Route>

        <Route path="/add-account">
          <CreateAccount modalProps={modalProps} actions={actions} />
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
            institution={options.institution}
            publicToken={options.publicToken}
            accounts={options.accounts}
            upgradingId={options.upgradingId}
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
                    backups: await send('backups-get', { id: budgetId })
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
          path="/manage-payees"
          render={() => {
            return (
              <ManagePayeesWithData
                history={history}
                modalProps={modalProps}
                initialSelectedIds={
                  options.selectedPayee ? [options.selectedPayee] : undefined
                }
              />
            );
          }}
        />

        <Route
          path="/manage-rules"
          render={() => {
            return (
              <ManageRules
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
              />
            );
          }}
        />

        <Route path="/welcome-screen">
          <WelcomeScreen modalProps={modalProps} actions={actions} />
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
    budgetId: state.prefs.local && state.prefs.local.id
  }),
  dispatch => ({ actions: bindActionCreators(actions, dispatch) })
)(Modals);
