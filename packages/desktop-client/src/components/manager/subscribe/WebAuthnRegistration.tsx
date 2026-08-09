import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { startRegistration } from '@simplewebauthn/browser';

type WebAuthnRegistrationProps = {
  buttons: ReactNode;
  onRegistered: () => void;
  onError: (error: string | null) => void;
};

export function WebAuthnRegistration({
  buttons,
  onRegistered,
  onError,
}: WebAuthnRegistrationProps) {
  const [loading, setLoading] = useState(false);

  async function onRegister() {
    if (loading) {
      return;
    }

    onError(null);
    setLoading(true);

    try {
      const { options, error: optionsError } = await send(
        'webauthn-get-registration-options',
      );

      if (optionsError) {
        onError(optionsError);
        return;
      }

      let attestation;
      try {
        attestation = await startRegistration({ optionsJSON: options });
      } catch {
        onError('webauthn-ceremony-failed');
        return;
      }

      const { error } = await send('webauthn-verify-registration', {
        response: attestation,
      });

      if (error) {
        onError(error);
      } else {
        onRegistered();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        fontSize: 15,
        marginTop: 30,
      }}
    >
      <View style={{ flex: 1 }} />
      {buttons}
      <ButtonWithLoading
        variant="primary"
        isLoading={loading}
        onPress={onRegister}
      >
        <Trans>Register a passkey</Trans>
      </ButtonWithLoading>
    </View>
  );
}
