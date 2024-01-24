// @ts-strict-ignore
import React, { useState, useRef } from 'react';

import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { theme } from '../../style';
import { type CommonModalProps } from '../../types/modals';
import { Error } from '../alerts';
import { Button } from '../common/Button';
import { Modal, ModalButtons } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';

function renderError(error) {
  return (
    <Error style={{ alignSelf: 'center' }}>
      {error === 'timeout'
        ? 'Timed out. Please try again.'
        : 'An error occurred while linking your account, sorry!'}
    </Error>
  );
}

type PlainExternalMsgProps = {
  modalProps: CommonModalProps;
  onMoveExternal: () => Promise<{ error; data }>;
  onSuccess: (data: unknown) => Promise<void>;
  onClose?: () => void;
};

export function PlaidExternalMsg({
  modalProps,
  onMoveExternal,
  onSuccess,
  onClose: originalOnClose,
}: PlainExternalMsgProps) {
  const [waiting, setWaiting] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const data = useRef(null);

  async function onJump() {
    setError(null);
    setWaiting('browser');

    const res = await onMoveExternal();
    if (res.error) {
      setError(res.error);
      setWaiting(null);
      return;
    }

    data.current = res.data;
    setWaiting(null);
    setSuccess(true);
  }

  function onClose() {
    originalOnClose?.();
    modalProps.onClose();
  }

  async function onContinue() {
    setWaiting('accounts');
    await onSuccess(data.current);
    setWaiting(null);
  }

  return (
    <Modal
      title="Link Your Bank"
      {...modalProps}
      onClose={onClose}
      style={{ flex: 0 }}
    >
      {() => (
        <View>
          <Paragraph style={{ fontSize: 15 }}>
            To link your bank account, you will be moved to your browser for
            enhanced security. Click below and Actual will automatically resume
            when you have given your bank’s credentials.
          </Paragraph>
          {error && renderError(error)}

          {waiting ? (
            <View style={{ alignItems: 'center', marginTop: 15 }}>
              <AnimatedLoading
                color={theme.pageTextDark}
                style={{ width: 20, height: 20 }}
              />
              <View style={{ marginTop: 10, color: theme.pageText }}>
                {waiting === 'browser'
                  ? 'Waiting on browser...'
                  : waiting === 'accounts'
                    ? 'Loading accounts...'
                    : null}
              </View>
            </View>
          ) : success ? (
            <Button
              type="primary"
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                marginTop: 10,
              }}
              onClick={onContinue}
            >
              Success! Click to continue &rarr;
            </Button>
          ) : (
            <Button
              type="primary"
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                marginTop: 10,
              }}
              onClick={onJump}
            >
              Link bank in browser &rarr;
            </Button>
          )}
          <div style={{ marginTop: waiting ? 30 : 35 }}>
            <Text style={{ color: theme.pageText, fontWeight: 600 }}>
              Why not link it in the app?
            </Text>
          </div>
          <Text
            style={{
              marginTop: 10,
              color: theme.pageText,
              fontSize: 13,
              '& a, & a:visited': {
                color: theme.pageText,
              },
            }}
          >
            Typing your bank’s username and password is one of the most
            security-sensitive things you can do, and the browser is the most
            secure app in the world. Why not use it to make sure your
            information is safe? [TODO: Link to docs article]
          </Text>

          <ModalButtons style={{ marginTop: 10 }}>
            <Button onClick={() => modalProps.onBack()}>Back</Button>
          </ModalButtons>
        </View>
      )}
    </Modal>
  );
}
