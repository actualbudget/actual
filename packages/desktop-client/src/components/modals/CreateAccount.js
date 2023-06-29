import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/src/client/actions/modals';

import useNordigenStatus from '../../hooks/useNordigenStatus';
import { authorizeBank } from '../../nordigen';
import {
  View,
  Text,
  Modal,
  P,
  Button,
  ButtonWithLoading,
  ExternalLink,
} from '../common';

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
        <View style={{ maxWidth: 500, gap: 30 }}>
          <View style={{ gap: 10 }}>
            <Button
              primary
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
              }}
              onClick={onCreateLocalAccount}
            >
              Create local account
            </Button>
            <View style={{ lineHeight: '1.4em', fontSize: 15 }}>
              <Text>
                <strong>Create a local account</strong> if you want to add
                transactions manually. You can also{' '}
                <ExternalLink
                  to="https://actualbudget.org/docs/transactions/importing"
                  linkColor="muted"
                >
                  import QIF/OFX/QFX files into a local account
                </ExternalLink>
                .
              </Text>
            </View>
          </View>
          <View style={{ gap: 10 }}>
            {syncServerStatus === 'online' ? (
              <>
                <ButtonWithLoading
                  disabled={syncServerStatus !== 'online'}
                  style={{
                    padding: '10px 0',
                    fontSize: 15,
                    fontWeight: 600,
                    flex: 1,
                  }}
                  onClick={onConnect}
                >
                  {isNordigenSetupComplete
                    ? 'Link bank account with Nordigen'
                    : 'Set up Nordigen for bank sync'}
                </ButtonWithLoading>
                <Text style={{ lineHeight: '1.4em', fontSize: 15 }}>
                  <strong>Link a bank account</strong> to automatically download
                  transactions. Nordigen provides reliable, up-to-date
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
                <P style={{ fontSize: 15 }}>
                  Connect to an Actual server to set up{' '}
                  <ExternalLink
                    to="https://actualbudget.org/docs/advanced/bank-sync"
                    linkColor="muted"
                  >
                    automatic syncing with Nordigen
                  </ExternalLink>
                  .
                </P>
              </>
            )}
          </View>
        </View>
      )}
    </Modal>
  );
}
