import React, { useLayoutEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import { connect } from 'react-redux';
import * as actions from 'loot-core/src/client/actions';

function ModalListener({ modalStack, navigatorRef, popModal }) {
  useLayoutEffect(() => {
    if (modalStack.length > 0) {
      let last = modalStack[modalStack.length - 1];
      let { name, options = {} } = last;

      switch (name) {
        case 'create-encryption-key':
          navigatorRef.current.dispatch(
            CommonActions.navigate('CreateEncryptionKeyModal', options)
          );
          popModal();
          break;
        case 'fix-encryption-key':
          navigatorRef.current.dispatch(
            CommonActions.navigate('FixEncryptionKeyModal', options)
          );
          popModal();
          break;
        case 'settings':
          navigatorRef.current.dispatch(
            CommonActions.navigate('Settings', options)
          );
          popModal();
          break;
        default:
      }
    }
  }, [modalStack]);

  return null;
}

export default connect(
  state => ({
    modalStack: state.modals.modalStack
  }),
  actions
)(ModalListener);
