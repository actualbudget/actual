import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { ButtonWithLoading } from '../../common/Button';
import { Input } from '../../common/Input';
import { useServerURL } from '../../ServerContext';

export function OpenIdForm({ onSetOpenId }) {
  const [issuer, setIssuer] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const serverUrl = useServerURL();

  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    await onSetOpenId({
      issuer,
      client_id: clientId,
      client_secret: clientSecret,
      server_hostname: serverUrl,
    });
    setLoading(false);
  }

  return (
    <form
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        marginTop: 30,
      }}
      onSubmit={onSubmit}
    >
      <Input
        placeholder="OpenID provider"
        type="text"
        value={issuer}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setIssuer(e.target.value)
        }
      />
      <Input
        placeholder="Client ID"
        type="text"
        value={clientId}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setClientId(e.target.value)
        }
        style={{ marginTop: 10 }}
      />
      <Input
        placeholder="Client secret"
        type="text"
        value={clientSecret}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setClientSecret(e.target.value)
        }
        style={{ marginTop: 10 }}
      />

      <ButtonWithLoading
        loading={loading}
        style={{ marginTop: 15 }}
        onClick={onSubmit}
      >
        OK
      </ButtonWithLoading>
    </form>
  );
}
