import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/src/client/actions/modals';

import useNordigenStatus from '../../hooks/useNordigenStatus';
import { authorizeBank } from '../../nordigen';
import { colors } from '../../style';
import { View, Text, Modal, P, Button, ButtonWithLoading } from '../common';

export default function CreateAccount({ modalProps, syncServerStatus }) {
  const dispatch = useDispatch();
  const [isNordigenSetupComplete, setIsNordigenSetupComplete] = useState(null);

  const onConnect = () => {
    if (!isNordigenSetupComplete) {
      onNordigenInit();
      return;
    }

    authorizeBank((modal, params) => dispatch(pushModal(modal, params)));
  };

  const onNordigenInit = () => {
    dispatch(
      pushModal('nordigen-init', {
        onSuccess: () => setIsNordigenSetupComplete(true),
      }),
    );
  };

  const onCreateLocalAccount = () => {
    dispatch(pushModal('add-local-account'));
  };

  const { configured } = useNordigenStatus();
  useEffect(() => {
    setIsNordigenSetupComplete(configured);
  }, [configured]);

  return (
    <Modal title="Add Account" {...modalProps}>
      {() => (
        <View style={{ maxWidth: 500 }}>
          <Text style={{ marginBottom: 10, lineHeight: '1.4em', fontSize: 15 }}>
            <strong>Link your bank accounts</strong> to automatically download
            transactions. We offer hundreds of banks to sync with, and Nordigen
            will provide reliable, up-to-date information.
          </Text>

          <ButtonWithLoading
            primary
            disabled={syncServerStatus !== 'online'}
            style={{
              padding: '10px 0',
              fontSize: 15,
              fontWeight: 600,
              marginTop: 10,
            }}
            onClick={onConnect}
          >
            {isNordigenSetupComplete
              ? 'Link bank account'
              : 'Set-up Nordigen for bank-sync'}
          </ButtonWithLoading>
          {isNordigenSetupComplete && (
            <Button bare onClick={onNordigenInit}>
              set new API secrets
            </Button>
          )}

          {syncServerStatus !== 'online' && (
            <P style={{ color: colors.r5, marginTop: 5 }}>
              Nordigen integration is only available for budgets using
              actual-server.{' '}
              <a
                href="https://actualbudget.github.io/docs/Installing/overview"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more.
              </a>
            </P>
          )}

          <View
            style={{
              marginTop: 30,
              marginBottom: 10,
              lineHeight: '1.4em',
              fontSize: 15,
            }}
          >
            You can also create a local account if you want to track
            transactions manually. You can add transactions manually or import
            QIF/OFX/QFX files.
          </View>

          <Button
            style={{
              padding: '10px 0',
              fontSize: 15,
              fontWeight: 600,
              marginTop: 10,
              color: colors.n3,
            }}
            onClick={onCreateLocalAccount}
          >
            Create local account
          </Button>
        </View>
      )}
    </Modal>
  );
}
