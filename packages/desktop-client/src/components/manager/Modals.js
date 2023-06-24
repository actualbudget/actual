import React from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';

import { View } from '../common';
import CreateEncryptionKey from '../modals/CreateEncryptionKey';
import FixEncryptionKey from '../modals/FixEncryptionKey';
import LoadBackup from '../modals/LoadBackup';

import DeleteFile from './DeleteFile';
import Import from './Import';
import ImportActual from './ImportActual';
import ImportYNAB4 from './ImportYNAB4';
import ImportYNAB5 from './ImportYNAB5';

function Modals({ modalStack, isHidden, availableImports, actions }) {
  let stack = modalStack.map(({ name, options }, idx) => {
    const modalProps = {
      onClose: actions.popModal,
      onPush: actions.pushModal,
      onBack: actions.popModal,
      isCurrent: idx === modalStack.length - 1,
      isHidden,
      stackIndex: idx,
    };

    switch (name) {
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
          <LoadBackup
            budgetId={options.budgetId}
            modalProps={{
              ...modalProps,
              onClose: actions.popModal,
            }}
            backupDisabled={true}
            actions={actions}
          />
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
  }),
  dispatch => ({ actions: bindActionCreators(actions, dispatch) }),
)(Modals);
