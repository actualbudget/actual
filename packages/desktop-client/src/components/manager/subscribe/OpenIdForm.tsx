import { type ReactNode, useState } from 'react';
import { useLocation, type Location } from 'react-router-dom';

import { theme, styles } from '../../../style';
import { ButtonWithLoading } from '../../common/Button2';
import { Input } from '../../common/Input';
import { Link } from '../../common/Link';
import { Menu } from '../../common/Menu';
import { Select } from '../../common/Select';
import { Stack } from '../../common/Stack';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { FormField, FormLabel } from '../../forms';
import { useServerURL } from '../../ServerContext';

export type OpenIdConfig = {
  issuer: string;
  client_id: string;
  client_secret: string;
  server_hostname: string;
};

type OpenIdCallback = (config: OpenIdConfig) => Promise<void>;

type OnProviderChangeCallback = (provider: OpenIdProviderOption) => void;

type OpenIdFormProps = {
  onSetOpenId: OpenIdCallback;
  otherButtons?: ReactNode[];
};

type OpenIdProviderOption = {
  label: string;
  value: string;
  issuer?: string | ((location: Location, serverUrl: string) => string);
  clientId?: string | ((location: Location, serverUrl: string) => string);
  clientSecret?: string | ((location: Location, serverUrl: string) => string);
  clientIdRequired: boolean;
  clientIdDisabled?: boolean;
  clientSecretRequired: boolean;
  clientSecretDisabled: boolean;
  submitButtonDisabled?: boolean;
  tip: string | ReactNode;
};

export function OpenIdForm({ onSetOpenId, otherButtons }: OpenIdFormProps) {
  const [issuer, setIssuer] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [clientIdRequired, setClientIdRequired] = useState(true);
  const [clientIdDisabled, setClientIdDisabled] = useState(false);
  const [clientSecretRequired, setClientSecretRequired] = useState(true);
  const [clientSecretDisabled, setClientSecretDisabled] = useState(false);
  const serverUrl = useServerURL();
  const location = useLocation();
  const [tip, setTip] = useState(null);
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleProviderChange = (provider: OpenIdProviderOption) => {
    if (provider) {
      const newIssuer =
        typeof provider.issuer === 'function'
          ? provider.issuer(location, serverUrl)
          : provider.issuer;

      setIssuer(newIssuer ?? '');

      const newClientId =
        typeof provider.clientId === 'function'
          ? provider.clientId(location, serverUrl)
          : provider.clientId;

      setClientId(newClientId ?? '');

      const newclientSecret =
        typeof provider.clientSecret === 'function'
          ? provider.clientSecret(location, serverUrl)
          : provider.clientSecret;

      setClientSecret(newclientSecret ?? '');

      setClientIdRequired(provider.clientIdRequired);
      setClientIdDisabled(provider.clientIdDisabled);
      setClientSecretRequired(provider.clientSecretRequired);
      setClientSecretDisabled(provider.clientSecretDisabled);

      setTip(provider.tip);

      setSubmitButtonDisabled(provider.submitButtonDisabled);
    }
  };

  async function onSubmit() {
    if (loading) {
      return;
    }

    setLoading(true);
    await onSetOpenId({
      issuer: issuer ?? '',
      client_id: clientId ?? '',
      client_secret: clientSecret ?? '',
      server_hostname: serverUrl ?? '',
    });
    setLoading(false);
  }

  return (
    <>
      <OpenIdProviderSelector onProviderChange={handleProviderChange} />
      <Stack direction="column" style={{ marginTop: 5 }}>
        <FormField style={{ flex: 1 }}>
          {!submitButtonDisabled && (
            <View>
              <Input
                id="issuer-field"
                type="text"
                value={issuer}
                placeholder="https://accounts.domain.tld/"
                onChangeValue={newValue => setIssuer(newValue)}
              />
            </View>
          )}
        </FormField>
      </Stack>
      <label
        htmlFor="issuer-field"
        style={{
          ...styles.verySmallText,
          color: theme.pageTextLight,
          minWidth: '150px',
          marginTop: 5,
          marginBottom: 10,
        }}
      >
        {!submitButtonDisabled && 'The OpenID provider URL.'}{' '}
        <Text
          style={{
            ...styles.verySmallText,
            color: theme.pageTextLight,
          }}
        >
          {tip}
        </Text>
      </label>{' '}
      <Stack>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="Client ID" htmlFor="clientid-field" />
          <Input
            type="text"
            id="clientid-field"
            value={clientId}
            disabled={clientIdDisabled}
            onChangeValue={newValue => setClientId(newValue)}
            required={clientIdRequired}
          />
          <label
            htmlFor="clientid-field"
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
            }}
          >
            The Client ID generated by the OpenID provider.
          </label>
        </FormField>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="Client secret" htmlFor="clientsecret-field" />
          <Input
            type="text"
            id="clientsecret-field"
            value={clientSecret}
            onChangeValue={newValue => setClientSecret(newValue)}
            disabled={clientSecretDisabled}
            required={clientSecretRequired}
          />
          <label
            htmlFor="clientsecret-field"
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
            }}
          >
            The client secret associated with the ID generated by the OpenID
            provider.
          </label>
        </FormField>

        <Stack direction="row" justify="flex-end" align="center">
          {otherButtons}
          <ButtonWithLoading
            variant="primary"
            isLoading={loading}
            onPress={onSubmit}
            isDisabled={submitButtonDisabled}
          >
            OK
          </ButtonWithLoading>
        </Stack>
      </Stack>
    </>
  );
}

const openIdProviders: (OpenIdProviderOption | typeof Menu.line)[] = [
  ...[
    {
      label: 'Google Accounts',
      value: 'google',
      issuer: 'https://accounts.google.com',
      clientIdRequired: true,
      clientSecretRequired: true,
      clientSecretDisabled: false,
      tip: (
        <Link
          variant="external"
          to="https://developers.google.com/identity/sign-in/web/sign-in"
        >
          Integrating Google Sign-In into your web app
        </Link>
      ),
    },
    {
      label: 'Passwordless.id',
      value: 'passwordless',
      issuer: 'https://api.passwordless.id',
      clientId: (location: Location, serverUrl: string) =>
        serverUrl
          ? serverUrl
          : window.location.href.replace(location.pathname, ''),
      clientIdRequired: true,
      clientSecretRequired: true,
      clientSecretDisabled: true,
      tip: (
        <Link variant="external" to="https://passwordless.id/">
          Get started with passwordless.id
        </Link>
      ),
    },
    {
      label: 'Microsoft Entra',
      value: 'microsoft',
      issuer: 'https://login.microsoftonline.com/common/v2.0/',
      clientIdRequired: true,
      clientSecretRequired: true,
      clientSecretDisabled: false,
      tip: (
        <Link
          variant="external"
          to="https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc"
        >
          OpenID Connect on the Microsoft identity platform
        </Link>
      ),
    },
    {
      label: 'Auth0',
      value: 'auth0',
      issuer: 'https://{domain.region}.auth0.com/',
      clientIdRequired: true,
      clientSecretRequired: true,
      clientSecretDisabled: false,
      tip: (
        <Text style={{ color: theme.warningText }}>
          Note that the URL depends on your application domain and region.{' '}
          <Link
            variant="external"
            to="https://auth0.com/docs/get-started/applications/application-settings"
          >
            Auth0 application settings
          </Link>
        </Text>
      ),
    },
    {
      label: 'Keycloak',
      value: 'keycloak',
      issuer: 'https://{domain}/realms/{realm}/',
      clientIdRequired: true,
      clientSecretRequired: true,
      clientSecretDisabled: false,
      tip: (
        <Text style={{ color: theme.warningText }}>
          Note that the URL depends on your Keycloak domain and realm.{' '}
          <Link
            variant="external"
            to="https://www.keycloak.org/docs/22.0.0/securing_apps/"
          >
            Securing Applications with Keycloak
          </Link>
        </Text>
      ),
    },
    {
      label: 'Github',
      value: 'github',
      clientIdRequired: true,
      clientSecretRequired: true,
      clientSecretDisabled: true,
      clientIdDisabled: true,
      submitButtonDisabled: true,
      tip: (
        <>
          <Text style={{ color: theme.errorText }}>
            Github does not support discovery. You need to configure it in the
            server.
          </Text>{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/budgeting/users/"
            linkColor="muted"
          >
            Learn more
          </Link>
        </>
      ),
    },
  ].sort((a, b) => a.label.localeCompare(b.label)),
  Menu.line,
  {
    label: 'Other',
    value: 'other',
    issuer: '',
    clientIdRequired: true,
    clientSecretRequired: true,
    clientSecretDisabled: false,
    tip: (
      <Text>
        Use any OpenId provider of your preference.{' '}
        <Text style={{ color: theme.warningText }}>
          If your provider does not support discovery, configure it manually
          from server
        </Text>{' '}
        <Link
          variant="external"
          to="https://actualbudget.org/docs/budgeting/users/"
          linkColor="muted"
        >
          Learn more
        </Link>
      </Text>
    ),
  },
];

function OpenIdProviderSelector({
  onProviderChange,
}: {
  onProviderChange: OnProviderChangeCallback;
}) {
  const [value, setValue] = useState('');
  const handleProviderChange = newValue => {
    const selectedProvider = openIdProviders.find(provider =>
      provider !== Menu.line ? provider.value === newValue : false,
    );
    if (selectedProvider !== Menu.line) {
      onProviderChange(selectedProvider);
      setValue(newValue);
    }
  };

  return (
    <FormField style={{ flex: 1, marginTop: 20 }}>
      <FormLabel title="OpenID Provider" htmlFor="provider-selector" />
      <Select
        options={openIdProviders.map(provider =>
          provider === Menu.line ? Menu.line : [provider.value, provider.label],
        )}
        defaultLabel="Select Provider"
        value={value}
        onChange={handleProviderChange}
      />
    </FormField>
  );
}
