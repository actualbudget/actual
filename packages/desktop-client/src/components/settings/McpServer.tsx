import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { McpServerStatus } from '@actual-app/core/typings/window';

import { Link } from '#components/common/Link';
import { Checkbox, FormField, FormLabel } from '#components/forms';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { saveGlobalPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

import { Setting } from './UI';

const DEFAULT_MCP_PORT = 5008;
const MCP_SERVER_NAME = 'actual-budget';

type McpClient =
  | 'claude-code'
  | 'claude-desktop'
  | 'cursor'
  | 'vscode'
  | 'other';

export function McpServerSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [mcpServerConfig] = useGlobalPref('mcpServerConfig');
  const [status, setStatus] = useState<McpServerStatus | null>(null);
  const [port, setPort] = useState(
    String(mcpServerConfig?.port || DEFAULT_MCP_PORT),
  );
  const [portError, setPortError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [client, setClient] = useState<McpClient>('claude-code');
  const [copied, setCopied] = useState<string | null>(null);

  const isEnabled = !!mcpServerConfig?.enabled;
  const token = mcpServerConfig?.token ?? '';
  const savedPort = mcpServerConfig?.port || DEFAULT_MCP_PORT;
  const url = `http://127.0.0.1:${savedPort}/mcp`;

  useEffect(() => {
    void window.Actual.getMcpServerStatus().then(setStatus);
  }, []);

  async function saveAndRestart(
    config: NonNullable<typeof mcpServerConfig>,
  ): Promise<void> {
    setIsBusy(true);
    try {
      await dispatch(
        saveGlobalPrefs({ prefs: { mcpServerConfig: config } }),
      ).unwrap();
      setStatus(await window.Actual.startMcpServer());
    } finally {
      setIsBusy(false);
    }
  }

  async function onToggle(enabled: boolean) {
    await saveAndRestart({
      ...mcpServerConfig,
      enabled,
      port: savedPort,
      token: token || generateToken(),
    });
  }

  async function onSavePort() {
    const parsed = Number(port);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      setPortError(t('Ports must be within range 1 - 65535'));
      return;
    }
    setPortError(null);
    await saveAndRestart({ ...mcpServerConfig, port: parsed });
  }

  async function onRegenerateToken() {
    await saveAndRestart({ ...mcpServerConfig, token: generateToken() });
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(
        () => setCopied(current => (current === id ? null : current)),
        2000,
      );
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  const statusMessage = getStatusMessage(status, isEnabled, t);
  const clientConfig = getClientConfig(client, url, token);

  return (
    <Setting>
      <Text>
        <strong>
          <Trans>AI assistant access (MCP server)</Trans>
        </strong>
      </Text>
      <Text>
        <Trans>
          Let AI apps that support the Model Context Protocol (MCP), such as
          Claude, Cursor or VS Code, read the budget you have open to give
          financial advice or analyze your spending. Access is{' '}
          <strong>read-only</strong>: an assistant can never add, change or
          delete anything. The server runs inside Actual, only accepts
          connections from this computer and stops when Actual is closed.{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/api/mcp-server"
            linkColor="purple"
          >
            Learn more
          </Link>
        </Trans>
      </Text>

      <Text style={{ display: 'flex', alignItems: 'center' }}>
        <Checkbox
          id="settings-mcpServerEnabled"
          checked={isEnabled}
          disabled={isBusy}
          onChange={e => void onToggle(e.currentTarget.checked)}
        />
        <label htmlFor="settings-mcpServerEnabled">
          <Trans>Enable the MCP server</Trans>
        </label>
      </Text>

      {statusMessage && (
        <Text
          style={{
            color: statusMessage.isError
              ? theme.errorText
              : theme.pageTextLight,
          }}
        >
          {statusMessage.text}
        </Text>
      )}

      {isEnabled && (
        <>
          <View
            style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}
          >
            <FormField style={{ width: '12ch' }}>
              <FormLabel title={t('Port')} htmlFor="settings-mcpServerPort" />
              <Input
                id="settings-mcpServerPort"
                type="number"
                value={port}
                onChangeValue={setPort}
                onEnter={() => void onSavePort()}
              />
            </FormField>
            <Button
              isDisabled={isBusy || port === String(savedPort)}
              onPress={() => void onSavePort()}
            >
              <Trans>Save and restart</Trans>
            </Button>
          </View>
          {portError && (
            <Text style={{ color: theme.errorText }}>{portError}</Text>
          )}

          <View style={{ gap: 5, width: '100%' }}>
            <FormLabel
              title={t('Server URL')}
              htmlFor="settings-mcpServerUrl"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input
                id="settings-mcpServerUrl"
                value={url}
                readOnly
                style={{ flex: 1, fontFamily: 'monospace' }}
              />
              <Button onPress={() => void copy('url', url)}>
                {copied === 'url' ? t('Copied') : t('Copy')}
              </Button>
            </View>
          </View>

          <View style={{ gap: 5, width: '100%' }}>
            <FormLabel
              title={t('Access token')}
              htmlFor="settings-mcpServerToken"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input
                id="settings-mcpServerToken"
                type="password"
                value={token}
                readOnly
                style={{ flex: 1, fontFamily: 'monospace' }}
              />
              <Button onPress={() => void copy('token', token)}>
                {copied === 'token' ? t('Copied') : t('Copy')}
              </Button>
              <Button
                isDisabled={isBusy}
                onPress={() => void onRegenerateToken()}
              >
                <Trans>Regenerate</Trans>
              </Button>
            </View>
            <Text style={{ color: theme.pageTextLight, fontSize: 13 }}>
              <Trans>
                AI apps send this token as an <code>Authorization: Bearer</code>{' '}
                header. Keep it private. Regenerating it disconnects apps that
                use the old token.
              </Trans>
            </Text>
          </View>

          <View style={{ gap: 5, width: '100%' }}>
            <FormLabel title={t('Connect an AI app')} />
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Select<McpClient>
                value={client}
                onChange={setClient}
                options={[
                  ['claude-code', t('Claude Code')],
                  ['claude-desktop', t('Claude Desktop')],
                  ['cursor', t('Cursor')],
                  ['vscode', t('VS Code')],
                  ['other', t('Other MCP clients')],
                ]}
              />
              <Button onPress={() => void copy('config', clientConfig.code)}>
                {copied === 'config' ? t('Copied') : t('Copy')}
              </Button>
            </View>
            <Text style={{ color: theme.pageTextLight, fontSize: 13 }}>
              {getClientHint(client, t)}
            </Text>
            <pre
              style={{
                margin: 0,
                padding: 10,
                width: '100%',
                boxSizing: 'border-box',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                fontFamily: 'monospace',
                fontSize: 12,
                color: theme.formInputText,
                backgroundColor: theme.formInputBackground,
                border: `1px solid ${theme.formInputBorder}`,
                borderRadius: 4,
              }}
            >
              {clientConfig.display}
            </pre>
            <Text style={{ color: theme.pageTextLight, fontSize: 13 }}>
              <Trans>
                Assistants can only see the budget that is currently open in
                Actual, and only while Actual is running.
              </Trans>
            </Text>
          </View>
        </>
      )}
    </Setting>
  );
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getStatusMessage(
  status: McpServerStatus | null,
  isEnabled: boolean,
  t: ReturnType<typeof useTranslation>['t'],
) {
  if (!isEnabled || !status) {
    return null;
  }
  if (status.running && status.url) {
    return {
      isError: false,
      text: t('Running and listening on {{url}}', { url: status.url }),
    };
  }
  if (status.error === 'port-in-use') {
    return {
      isError: true,
      text: t(
        'The port is already used by another program. Choose another port.',
      ),
    };
  }
  if (status.error === 'missing-token') {
    return {
      isError: true,
      text: t('Generate an access token to start the server.'),
    };
  }
  return {
    isError: true,
    text: status.error
      ? t('The MCP server could not start: {{error}}', { error: status.error })
      : t('The MCP server is not running.'),
  };
}

function getClientHint(
  client: McpClient,
  t: ReturnType<typeof useTranslation>['t'],
) {
  switch (client) {
    case 'claude-code':
      return t('Run this command in a terminal:');
    case 'claude-desktop':
      return t(
        'Add this to claude_desktop_config.json (Settings → Developer → Edit Config) and restart Claude Desktop. Requires Node.js, which runs the mcp-remote bridge.',
      );
    case 'cursor':
      return t('Add this to ~/.cursor/mcp.json:');
    case 'vscode':
      return t(
        'Add this to .vscode/mcp.json, or to your user MCP configuration:',
      );
    default:
      return t('Use the Streamable HTTP transport with this URL and header:');
  }
}

// The token is masked in what is displayed, but copied in full.
function getClientConfig(client: McpClient, url: string, token: string) {
  const build = (secret: string) => {
    const authorization = `Bearer ${secret}`;
    switch (client) {
      case 'claude-code':
        return `claude mcp add --transport http ${MCP_SERVER_NAME} ${url} --header "Authorization: ${authorization}"`;
      case 'claude-desktop':
        return JSON.stringify(
          {
            mcpServers: {
              [MCP_SERVER_NAME]: {
                command: 'npx',
                args: [
                  '-y',
                  'mcp-remote',
                  url,
                  '--allow-http',
                  '--header',
                  // mcp-remote expands ${AUTH_HEADER} from `env` itself
                  // oxlint-disable-next-line eslint/no-template-curly-in-string
                  'Authorization:${AUTH_HEADER}',
                ],
                env: { AUTH_HEADER: authorization },
              },
            },
          },
          null,
          2,
        );
      case 'cursor':
        return JSON.stringify(
          {
            mcpServers: {
              [MCP_SERVER_NAME]: {
                url,
                headers: { Authorization: authorization },
              },
            },
          },
          null,
          2,
        );
      case 'vscode':
        return JSON.stringify(
          {
            servers: {
              [MCP_SERVER_NAME]: {
                type: 'http',
                url,
                headers: { Authorization: authorization },
              },
            },
          },
          null,
          2,
        );
      default:
        return `URL: ${url}\nHeader: Authorization: ${authorization}`;
    }
  };

  const masked = token ? `${token.slice(0, 4)}…${token.slice(-4)}` : '';
  return { code: build(token), display: build(masked) };
}
