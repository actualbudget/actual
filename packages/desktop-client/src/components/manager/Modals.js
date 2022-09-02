import React from 'react';
import { connect } from 'react-redux';

import Component from '@reactions/component';
import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';
import { View } from 'loot-design/src/components/common';
import BudgetList from 'loot-design/src/components/manager/BudgetList';
import DeleteFile from 'loot-design/src/components/manager/DeleteFile';
import Import from 'loot-design/src/components/manager/Import';
import ImportActual from 'loot-design/src/components/manager/ImportActual';
import ImportYNAB4 from 'loot-design/src/components/manager/ImportYNAB4';
import ImportYNAB5 from 'loot-design/src/components/manager/ImportYNAB5';
import LoadBackup from 'loot-design/src/components/modals/LoadBackup';

import CreateEncryptionKey from '../modals/CreateEncryptionKey';
import FixEncryptionKey from '../modals/FixEncryptionKey';

function Modals({
  modalStack,
  isHidden,
  allFiles,
  availableImports,
  globalPrefs,
  isLoggedIn,
  actions
}) {
  let stack = modalStack.map(({ name, options }, idx) => {
    const modalProps = {
      onClose: actions.closeModal,
      onPush: actions.pushModal,
      onBack: actions.popModal,
      isCurrent: idx === modalStack.length - 1,
      isHidden,
      stackIndex: idx
    };

    switch (name) {
      case 'select-budget':
        return (
          <BudgetList
            key={name}
            modalProps={modalProps}
            files={allFiles}
            actions={actions}
            isLoggedIn={isLoggedIn}
            onDownload={cloudFileId => actions.downloadBudget(cloudFileId)}
          />
        );
      case 'delete-budget':
        return (
          <DeleteFile
            key={name}
            modalProps={modalProps}
            actions={actions}
            file={options.file}
          />
        );
      case 'import':
        return (
          <Import
            key={name}
            modalProps={modalProps}
            actions={actions}
            availableImports={availableImports}
          />
        );
      case 'import-ynab4':
        return (
          <ImportYNAB4 key={name} modalProps={modalProps} actions={actions} />
        );
      case 'import-ynab5':
        return (
          <ImportYNAB5 key={name} modalProps={modalProps} actions={actions} />
        );
      case 'import-actual':
        return (
          <ImportActual key={name} modalProps={modalProps} actions={actions} />
        );
      case 'load-backup': {
        return (
          <Component
            key={name}
            initialState={{ backups: [] }}
            didMount={async ({ setState }) => {
              setState({
                backups: await send('backups-get', { id: options.budgetId })
              });
            }}
          >
            {({ state }) => (
              <LoadBackup
                budgetId={options.budgetId}
                modalProps={{
                  ...modalProps,
                  onClose: actions.popModal
                }}
                backupDisabled={true}
                actions={actions}
                backups={state.backups}
              />
            )}
          </Component>
        );
      }
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
      default:
        throw new Error('Unknown modal: ' + name);
    }
  });

  return <View style={{ flex: 1, padding: 50 }}>{stack}</View>;
}

export default connect(
  state => ({
    modalStack: state.modals.modalStack,
    isHidden: state.modals.isHidden,
    budgets: state.budgets.budgets,
    availableImports: state.budgets.availableImports,
    globalPrefs: state.prefs.global,
    allFiles: state.budgets.allFiles,
    isLoggedIn: !!state.user.data
  }),
  dispatch => ({ actions: bindActionCreators(actions, dispatch) })
)(Modals);
