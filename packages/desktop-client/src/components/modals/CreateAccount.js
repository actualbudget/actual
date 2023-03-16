import React from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/src/client/actions/modals';
import {
  View,
  Text,
  Modal,
  P,
  Button,
  ButtonWithLoading,
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { authorizeBank } from '../../nordigen';

export default function CreateAccount({ modalProps, syncServerStatus }) {
  const dispatch = useDispatch();

  const onConnect = () => {
    authorizeBank((modal, params) => dispatch(pushModal(modal, params)));
  };

  const onCreateLocalAccount = () => {
    dispatch(pushModal('add-local-account'));
  };

  return (
    <Modal title="Add Account" {...modalProps}>
      {() => (
        <View style={{ maxWidth: 500 }}>
          <Text style={{ marginBottom: 10, lineHeight: '1.4em', fontSize: 15 }}>
            <strong>Link your bank accounts</strong> to automatically download
            transactions. We offer hundreds of banks to sync with, and our
            service will provide reliable, up-to-date information.
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
            Link bank account
          </ButtonWithLoading>

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
