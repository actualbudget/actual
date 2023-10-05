import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/src/client/actions/modals';

import { authorizeBank } from '../../gocardless';
import useGoCardlessStatus from '../../hooks/useGoCardlessStatus';
import { theme } from '../../style';
import Button, { ButtonWithLoading } from '../common/Button';
import ExternalLink from '../common/ExternalLink';
import Modal from '../common/Modal';
import Paragraph from '../common/Paragraph';
import Text from '../common/Text';
import View from '../common/View';

export default function CreateAccount({ modalProps, syncServerStatus }) {
  const dispatch = useDispatch();
  const [isGoCardlessSetupComplete, setIsGoCardlessSetupComplete] =
    useState(null);

  const onConnect = () => {
    if (!isGoCardlessSetupComplete) {
      onGoCardlessInit();
      return;
    }

    authorizeBank((modal, params) => dispatch(pushModal(modal, params)));
  };

  const onGoCardlessInit = () => {
    dispatch(
      pushModal('gocardless-init', {
        onSuccess: () => setIsGoCardlessSetupComplete(true),
      }),
    );
  };

  const onCreateLocalAccount = () => {
    dispatch(pushModal('add-local-account'));
  };

  const { configured } = useGoCardlessStatus();
  useEffect(() => {
    setIsGoCardlessSetupComplete(configured);
  }, [configured]);

  return (
    <Modal title="Add Account" {...modalProps}>
      {() => (
        <View style={{ maxWidth: 500, gap: 30, color: theme.pageText }}>
          <View style={{ gap: 10 }}>
            <Button
              type="primary"
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
                  {isGoCardlessSetupComplete
                    ? 'Link bank account with GoCardless'
                    : 'Set up GoCardless for bank sync'}
                </ButtonWithLoading>
                <Text style={{ lineHeight: '1.4em', fontSize: 15 }}>
                  <strong>Link a bank account</strong> to automatically download
                  transactions. GoCardless provides reliable, up-to-date
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
                  Set up GoCardless for bank sync
                </Button>
                <Paragraph style={{ fontSize: 15 }}>
                  Connect to an Actual server to set up{' '}
                  <ExternalLink
                    to="https://actualbudget.org/docs/advanced/bank-sync"
                    linkColor="muted"
                  >
                    automatic syncing with GoCardless
                  </ExternalLink>
                  .
                </Paragraph>
              </>
            )}
          </View>
        </View>
      )}
    </Modal>
  );
}
