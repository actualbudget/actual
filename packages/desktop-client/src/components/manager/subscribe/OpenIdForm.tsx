import { type ReactNode, useEffect, useState } from 'react';
import { useLocation, type Location } from 'react-router-dom';

import { send } from 'loot-core/platform/client/fetch';
import { type OpenIdConfig } from 'loot-core/types/models/openid';

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

type OpenIdCallback = (config: OpenIdConfig) => Promise<void>;

type OnProviderChangeCallback = (provider: OpenIdProviderOption) => void;

type OpenIdFormProps = {
  onSetOpenId: OpenIdCallback;
  otherButtons?: ReactNode[];
  loadData?: boolean;
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
  tip: ReactNode;
};

export function OpenIdForm({
  onSetOpenId,
  otherButtons,
  loadData,
}: OpenIdFormProps) {
  const [issuer, setIssuer] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [clientIdRequired, setClientIdRequired] = useState(true);
  const [clientIdDisabled, setClientIdDisabled] = useState(false);
  const [clientSecretRequired, setClientSecretRequired] = useState(true);
  const [clientSecretDisabled, setClientSecretDisabled] = useState(false);
  const [providerName, setProviderName] = useState('other');
  const serverUrl = useServerURL();
  const location = useLocation();
  const [tip, setTip] = useState((<Text />) as ReactNode);
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    debugger;
    if (loadData) {
      send('get-openid-config').then((config: { openId?: OpenIdConfig }) => {
        setProviderName(config?.openId?.selectedProvider ?? 'other');
        setIssuer(config?.openId?.issuer ?? '');
        setClientId(config?.openId?.client_id ?? '');
        setClientSecret(config?.openId?.client_secret ?? '');
      });
    }
  }, [loadData]);

  const handleProviderChange = (provider: OpenIdProviderOption) => {
    if (provider) {
      setProviderName(provider.value);
      const newIssuer =
        typeof provider.issuer === 'function'
          ? provider.issuer(location, serverUrl ?? '')
          : provider.issuer;

      setIssuer(newIssuer ?? '');

      const newClientId =
        typeof provider.clientId === 'function'
          ? provider.clientId(location, serverUrl ?? '')
          : provider.clientId;

      setClientId(newClientId ?? '');

      const newclientSecret =
        typeof provider.clientSecret === 'function'
          ? provider.clientSecret(location, serverUrl ?? '')
          : provider.clientSecret;

      setClientSecret(newclientSecret ?? '');

      setClientIdRequired(provider.clientIdRequired ?? true);
      setClientIdDisabled(provider.clientIdDisabled ?? false);
      setClientSecretRequired(provider.clientSecretRequired ?? true);
      setClientSecretDisabled(provider.clientSecretDisabled ?? false);

      setTip(provider.tip ?? <Text />);

      setSubmitButtonDisabled(provider.submitButtonDisabled ?? false);
    }
  };

  async function onSubmit() {
    if (loading) {
      return;
    }

    setLoading(true);
    await onSetOpenId({
      selectedProvider: providerName,
      issuer: issuer ?? '',
      client_id: clientId ?? '',
      client_secret: clientSecret ?? '',
      server_hostname: serverUrl ?? '',
    });
    setLoading(false);
  }

  return (
    <>
      <OpenIdProviderSelector
        onProviderChange={handleProviderChange}
        defaultValue={providerName}
      />
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
          maxWidth: '500px',
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
            to="https://actualbudget.org/docs/"
            linkColor="muted"
          >
            Learn more
          </Link>
        </>
      ),
    },
    {
      label: 'Authentik',
      value: 'authentik',
      issuer: 'https://{domain}/application/o/{provider-slug-name}/',
      clientIdRequired: true,
      clientSecretRequired: true,
      clientSecretDisabled: false,
      tip: (
        <Text style={{ color: theme.warningText }}>
          Note that the URL depends on your Authentik domain and provider slug
          name.{' '}
          <Link
            variant="external"
            to="https://docs.goauthentik.io/docs/providers/oauth2/"
          >
            Configure OAuth2 Provider
          </Link>
        </Text>
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
          to="https://actualbudget.org/docs/"
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
  defaultValue,
}: {
  onProviderChange: OnProviderChangeCallback;
  defaultValue: string;
}) {
  const handleProviderChange = (newValue: string) => {
    const selectedProvider = openIdProviders.find(provider =>
      provider !== Menu.line ? provider.value === newValue : false,
    );
    if (selectedProvider && selectedProvider !== Menu.line) {
      onProviderChange(selectedProvider);
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
        value={defaultValue}
        onChange={handleProviderChange}
      />
    </FormField>
  );
}
