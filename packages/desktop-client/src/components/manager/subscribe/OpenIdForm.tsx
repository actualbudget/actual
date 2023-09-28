import type { ChangeEvent } from 'react';
import { useState } from 'react';

import ButtonWithLoading from '../../common/Button';
import Input from '../../common/Input';
import { useServerURL } from '../../ServerContext';

export function OpenIdForm({ onSetOpenId, onError }) {
  let [issuer, setIssuer] = useState('');
  let [clientId, setClientId] = useState('');
  let [clientSecret, setClientSecret] = useState('');
  let serverUrl = useServerURL();

  let [loading, setLoading] = useState(false);

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

  console.log(onSubmit, onError);
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

      <ButtonWithLoading primary loading={loading} style={{ marginTop: 15 }}>
        OK
      </ButtonWithLoading>
    </form>
  );
}
