import React, { useState, useRef } from 'react';

import { colors } from '../../style';
import AnimatedLoading from '../../svg/AnimatedLoading';
import { Error } from '../alerts';
import { View, Text, Modal, Button, P, ModalButtons } from '../common';

function renderError(error) {
  return (
    <Error style={{ alignSelf: 'center' }}>
      {error === 'timeout'
        ? 'Timed out. Please try again.'
        : 'An error occurred while linking your account, sorry!'}
    </Error>
  );
}

export default function PlaidExternalMsg({
  modalProps,
  onMoveExternal,
  onSuccess,
  onClose: originalOnClose
}) {
  let [waiting, setWaiting] = useState(null);
  let [success, setSuccess] = useState(false);
  let [error, setError] = useState(null);
  let data = useRef(null);

  async function onJump() {
    setError(null);
    setWaiting('browser');

    let res = await onMoveExternal();
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
    originalOnClose && originalOnClose();
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
          <P style={{ fontSize: 15 }}>
            To link your bank account, you will be moved to your browser for
            enhanced security. Click below and Actual will automatically resume
            when you have given your bank{"'"}s credentials.
          </P>
          {error && renderError(error)}

          {waiting ? (
            <View style={{ alignItems: 'center', marginTop: 15 }}>
              <AnimatedLoading
                color={colors.n1}
                style={{ width: 20, height: 20 }}
              />
              <View style={{ marginTop: 10, color: colors.n4 }}>
                {waiting === 'browser'
                  ? 'Waiting on browser...'
                  : waiting === 'accounts'
                  ? 'Loading accounts...'
                  : null}
              </View>
            </View>
          ) : success ? (
            <Button
              primary
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                marginTop: 10,
                backgroundColor: colors.g4,
                borderColor: colors.g4
              }}
              onClick={onContinue}
            >
              Success! Click to continue &rarr;
            </Button>
          ) : (
            <Button
              primary
              style={{
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                marginTop: 10
              }}
              onClick={onJump}
            >
              Link bank in browser &rarr;
            </Button>
          )}
          <div style={{ marginTop: waiting ? 30 : 35 }}>
            <Text style={{ color: colors.n5, fontWeight: 600 }}>
              Why not link it in the app?
            </Text>
          </div>
          <Text
            style={{
              marginTop: 10,
              color: colors.n5,
              fontSize: 13,
              '& a, & a:visited': {
                color: colors.n5
              }
            }}
          >
            Typing your bank{"'"}s username and password is one of the most
            security-sensitive things you can do, and the browser is the most
            secure app in the world. Why not use it to make sure your
            information is safe?{' '}
            <a href="https://actualbudget.com/security-learn-more">
              Learn more about security
            </a>
          </Text>

          <ModalButtons style={{ marginTop: 10 }}>
            <Button onClick={() => modalProps.onBack()}>Back</Button>
          </ModalButtons>
        </View>
      )}
    </Modal>
  );
}
