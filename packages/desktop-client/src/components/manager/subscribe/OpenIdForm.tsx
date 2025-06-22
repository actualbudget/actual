import { type ReactNode, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, type Location } from 'react-router';

import { ButtonWithLoading } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { ResponsiveInput } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Select } from '@actual-app/components/select';
import { Stack } from '@actual-app/components/stack';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type OpenIdConfig } from 'loot-core/types/models';

import { Link } from '@desktop-client/components/common/Link';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { useServerURL } from '@desktop-client/components/ServerContext';

type OpenIdCallback = (config: OpenIdConfig) => Promise<void>;

type OnProviderChangeCallback = (provider: OpenIdProviderOption) => void;

type OpenIdFormProps = {
  onSetOpenId: OpenIdCallback;
  otherButtons?: ReactNode[];
  openIdData?: OpenIdConfig;
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
  openIdData,
}: OpenIdFormProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
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
    if (openIdData) {
      setProviderName(openIdData.selectedProvider ?? 'other');
      setIssuer(openIdData.issuer ?? '');
      setClientId(openIdData.client_id ?? '');
      setClientSecret(openIdData.client_secret ?? '');
    }
  }, [openIdData]);

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
      discoveryURL: issuer ?? '',
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
              <ResponsiveInput
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
        {!submitButtonDisabled && t('The OpenID provider URL.')}{' '}
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
          <FormLabel title={t('Client ID')} htmlFor="clientid-field" />
          <ResponsiveInput
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
            <Trans>The Client ID generated by the OpenID provider.</Trans>
          </label>
        </FormField>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Client secret')} htmlFor="clientsecret-field" />
          <ResponsiveInput
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
            <Trans>
              The client secret associated with the ID generated by the OpenID
              provider.
            </Trans>
          </label>
        </FormField>

        <Stack direction="row" justify="flex-end" align="center">
          {otherButtons}
          <ButtonWithLoading
            variant="primary"
            isLoading={loading}
            onPress={onSubmit}
            isDisabled={submitButtonDisabled}
            style={isNarrowWidth ? { padding: 10 } : undefined}
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
          <Trans>Integrating Google Sign-In into your web app</Trans>
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
          <Trans>Get started with passwordless.id</Trans>
        </Link>
      ),
    },
    {
      label: 'Microsoft Entra',
      value: 'microsoft',
      issuer: 'https://login.microsoftonline.com/{tenant-id}',
      clientIdRequired: true,
      clientSecretRequired: true,
      clientSecretDisabled: false,
      tip: (
        <Link
          variant="external"
          to="https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc"
        >
          <Trans>OpenID Connect on the Microsoft identity platform</Trans>
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
          <Trans>
            Note that the URL depends on your application domain and region.
          </Trans>{' '}
          <Link
            variant="external"
            to="https://auth0.com/docs/get-started/applications/application-settings"
          >
            <Trans>Auth0 application settings</Trans>
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
          <Trans>
            Note that the URL depends on your Keycloak domain and realm.
          </Trans>{' '}
          <Link
            variant="external"
            to="https://www.keycloak.org/docs/22.0.0/securing_apps/"
          >
            <Trans>Securing Applications with Keycloak</Trans>
          </Link>
        </Text>
      ),
    },
    {
      label: 'GitHub',
      value: 'github',
      clientIdRequired: true,
      clientSecretRequired: true,
      clientSecretDisabled: true,
      clientIdDisabled: true,
      submitButtonDisabled: true,
      tip: (
        <>
          <Text style={{ color: theme.errorText }}>
            <Trans>
              GitHub does not support discovery. You need to configure it in the
              server.
            </Trans>
          </Text>{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/"
            linkColor="muted"
          >
            <Trans>Learn more</Trans>
          </Link>
        </>
      ),
    },
    {
      label: 'authentik',
      value: 'authentik',
      issuer: 'https://{domain}/application/o/{provider-slug-name}/',
      clientIdRequired: true,
      clientSecretRequired: true,
      clientSecretDisabled: false,
      tip: (
        <Text style={{ color: theme.warningText }}>
          <Trans>
            Note that the URL depends on your authentik domain and provider slug
            name.
          </Trans>{' '}
          <Link
            variant="external"
            to="https://docs.goauthentik.io/integrations/services/actual-budget/"
          >
            <Trans>Configure OAuth2 provider</Trans>
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
        <Trans>
          Use any OpenId provider of your preference.{' '}
          <Text style={{ color: theme.warningText }}>
            If your provider does not support discovery, configure it manually
            from server
          </Text>
        </Trans>{' '}
        <Link
          variant="external"
          to="https://actualbudget.org/docs/"
          linkColor="muted"
        >
          <Trans>Learn more</Trans>
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
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

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
      <FormLabel title={t('OpenID provider')} htmlFor="provider-selector" />
      <Select
        options={openIdProviders.map(provider =>
          provider === Menu.line ? Menu.line : [provider.value, provider.label],
        )}
        defaultLabel={t('Select Provider')}
        value={defaultValue}
        onChange={handleProviderChange}
        style={isNarrowWidth ? { padding: 10 } : undefined}
      />
    </FormField>
  );
}
