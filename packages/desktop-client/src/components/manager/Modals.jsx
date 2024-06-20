import React from 'react';
import { useSelector } from 'react-redux';

import { useActions } from '../../hooks/useActions';
import { View } from '../common/View';
import { CreateEncryptionKeyModal } from '../modals/CreateEncryptionKeyModal';
import { FixEncryptionKeyModal } from '../modals/FixEncryptionKeyModal';
import { LoadBackup } from '../modals/LoadBackup';

import { DeleteFile } from './DeleteFile';
import { Import } from './Import';
import { ImportActual } from './ImportActual';
import { ImportYNAB4 } from './ImportYNAB4';
import { ImportYNAB5 } from './ImportYNAB5';

export function Modals() {
  const modalStack = useSelector(state => state.modals.modalStack);
  const isHidden = useSelector(state => state.modals.isHidden);
  const actions = useActions();

  const stack = modalStack.map(({ name, options = {} }, idx) => {
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
        return <Import key={name} modalProps={modalProps} actions={actions} />;
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
      default:
        throw new Error('Unknown modal: ' + name);
    }
  });

  return <View style={{ flex: 1, padding: 50 }}>{stack}</View>;
}
