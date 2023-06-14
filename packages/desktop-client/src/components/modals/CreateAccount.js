import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/src/client/actions/modals';

import useNordigenStatus from '../../hooks/useNordigenStatus';
import { authorizeBank } from '../../nordigen';
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
          {syncServerStatus === 'online' ? (
            <>
              <ButtonWithLoading
                disabled={syncServerStatus !== 'online'}
                style={{
                  padding: '10px 0',
                  fontSize: 15,
                  fontWeight: 600,
                }}
                onClick={onConnect}
              >
                {isNordigenSetupComplete
                  ? 'Link bank account with Nordigen'
                  : 'Set up Nordigen for bank sync'}
              </ButtonWithLoading>
              {isNordigenSetupComplete && (
                <Button bare onClick={onNordigenInit}>
                  set new API secrets
                </Button>
              )}
              <Text
                style={{ marginTop: 10, lineHeight: '1.4em', fontSize: 15 }}
              >
                <strong>Link a bank account</strong> to automatically download
                transactions. Nordigen will provide reliable, up-to-date
                information from hundreds of banks.
              </Text>
            </>
          ) : (
            <>
              <Button
                disabled
                style={{
                  padding: '10px 0',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Set up Nordigen for bank sync
              </Button>
              <P
                style={{
                  marginTop: 10,
                  fontSize: 15,
                }}
              >
                Connect to an Actual server to set up{' '}
                <a
                  href="https://actualbudget.org/docs/experimental/bank-sync"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  automatic syncing with Nordigen
                </a>
                .
              </P>
            </>
          )}

          <Button
            style={{
              padding: '10px 0',
              fontSize: 15,
              fontWeight: 600,
              marginTop: 30,
            }}
            onClick={onCreateLocalAccount}
          >
            Create local account
          </Button>

          <View
            style={{
              marginTop: 10,
              lineHeight: '1.4em',
              fontSize: 15,
            }}
          >
            <P>
              <strong>Create a local account</strong> if you want to add
              transactions manually. You can also{' '}
              <a
                href="https://actualbudget.org/docs/transactions/importing"
                target="_blank"
                rel="noopener noreferrer"
              >
                import QIF/OFX/QFX files into a local account
              </a>
              .
            </P>
          </View>
        </View>
      )}
    </Modal>
  );
}
