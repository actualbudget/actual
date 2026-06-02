import { type ChangeEvent, type RefObject, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgPause, SvgPlay, SvgTrash } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Popover } from '@actual-app/components/popover';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { type ActualPluginStored } from '@actual-app/core/types/models/actual-plugin-stored';
import { t } from 'i18next';

import { InfiniteScrollWrapper } from '#components/common/InfiniteScrollWrapper';
import { Link } from '#components/common/Link';
import { Cell, Row } from '#components/table';
import { addNotification } from '#notifications/notificationsSlice';
import { useActualPlugins } from '#plugin/ActualPluginsProvider';
import { installPluginFromZipFile } from '#plugin/core/pluginInstaller';
import { persistPlugin, removePlugin } from '#plugin/core/pluginStore';
import { useDispatch } from '#redux';

import { PluginsHeader } from './PluginsHeader';

export function ManagePlugins() {
  const devPlugin = useRef<HTMLInputElement>(null);
  const { refreshPluginStore } = useActualPlugins();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <View
          style={{
            color: theme.pageTextLight,
            flexDirection: 'row',
            alignItems: 'center',
            width: '50%',
          }}
        >
          <Text>
            {
              <Trans>
                Manage and configure plugins to enhance functionality and
                efficiency.
              </Trans>
            }{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/experimental/plugins/"
              linkColor="muted"
            >
              <Trans>Learn more</Trans>
            </Link>
          </Text>
        </View>
      </View>
      <View
        style={{
          gap: 8,
          flexDirection: 'row',
          placeContent: 'end',
          marginTop: 8,
        }}
      >
        <PluginUploader />
        {/* Store plugin controls are intentionally disabled while unified
            plugin install supports only ZIP upload and dev plugins.
        <Button variant="normal" onPress={async () => {}}>
          <Trans>Check for updates</Trans>
        </Button>
        <Button variant="primary" onPress={() => {}}>
          <Trans>Add new plugin</Trans>
        </Button>
        */}
      </View>
      <View style={{ flex: 1, paddingTop: 16 }}>
        <PluginsHeader />
        <InfiniteScrollWrapper loadMore={() => {}}>
          <div />
          <PluginList />
          {/* {filteredRules.length === 0 ? (
              <EmptyMessage text={t('No rules')} style={{ marginTop: 15 }} />
            ) : (
              <RulesList
                rules={filteredRules}
                selectedItems={selectedInst.items}
                hoveredRule={hoveredRule}
                onHover={onHover}
                onEditRule={onEditRule}
                onDeleteRule={rule => onDeleteRule(rule.id)}
              />
            )} */}
        </InfiniteScrollWrapper>
      </View>
      <View
        style={{
          paddingBlock: 15,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" align="center" justify="flex-end" spacing={2}>
          {/* {selectedInst.items.size > 0 && (
              <Button onPress={onDeleteSelected}>
                Delete {selectedInst.items.size} plugins
              </Button>
            )} */}
        </Stack>
      </View>
      {process.env.NODE_ENV === 'development' && (
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Input
            style={{ flex: 1 }}
            ref={devPlugin}
            value="http://localhost:2000/manifest.json"
          />{' '}
          <Button
            variant="primary"
            onPress={async () => {
              if (devPlugin.current) {
                // Wait for service worker ready event
                await refreshPluginStore(devPlugin.current.value);
              }
            }}
          >
            <Trans>Enable Dev Plugin</Trans>
          </Button>
        </View>
      )}
    </View>
  );
}

function PluginList() {
  const { pluginStore, plugins } = useActualPlugins();

  // Check if there are any dev plugins running (plugins not in pluginStore)
  const devPlugins = plugins.filter(
    p => !pluginStore.some(stored => stored.name === p.name),
  );

  return (
    <div data-testid="installed-plugins">
      {/* Show dev plugins first */}
      {devPlugins.map((devPlugin, index) => (
        <Row
          key={`dev-plugin-${index}`}
          height="auto"
          style={{
            fontSize: 13,
            backgroundColor: theme.tableBackground,
            borderLeft: `4px solid ${theme.noticeTextLight}`,
          }}
          collapsed={true}
        >
          <Cell
            name="name"
            width={180}
            plain
            style={{ color: theme.tableText }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                margin: 5,
                borderRadius: 4,
                padding: '3px 5px',
              }}
            >
              {devPlugin.name || t('Dev Plugin')}
              <span
                style={{
                  color: theme.noticeTextLight,
                  fontSize: 11,
                  marginLeft: 4,
                }}
              >
                (DEV)
              </span>
            </View>
          </Cell>
          <Cell
            name="version"
            width={80}
            plain
            style={{ color: theme.tableText }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                margin: 5,
                borderRadius: 4,
                padding: '3px 5px',
              }}
            >
              {devPlugin.version || '0.0.0-dev'}
            </View>
          </Cell>
          <Cell
            name="url"
            width="flex"
            plain
            style={{ color: theme.tableText }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                margin: 5,
                borderRadius: 4,
                padding: '3px 5px',
              }}
            >
              http://localhost:2000/mf-manifest.json
            </View>
          </Cell>
          <Cell
            name="state"
            width={100}
            plain
            style={{ color: theme.tableText }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                margin: 5,
                borderRadius: 4,
                padding: '3px 5px',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <Trans>Running</Trans>{' '}
              <span style={{ color: theme.noticeTextLight }}>(DEV)</span>
            </View>
          </Cell>
          <Cell
            name="description"
            width="flex"
            plain
            style={{ color: theme.tableText }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                margin: 5,
                borderRadius: 4,
                padding: '3px 5px',
              }}
            >
              <Trans>Development plugin loaded from local server</Trans>
            </View>
          </Cell>
          <Cell
            name="actions"
            width={100}
            plain
            style={{ color: theme.tableText }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                margin: 5,
                borderRadius: 4,
                padding: '3px 5px',
              }}
            >
              <span style={{ color: theme.noticeTextLight, fontSize: 11 }}>
                <Trans>Runtime only</Trans>
              </span>
            </View>
          </Cell>
        </Row>
      ))}

      {/* Show regular plugins */}
      {pluginStore.map(plugin => (
        <PluginRow
          key={`${plugin.name}-${plugin.version}`}
          plugin={plugin}
          enabled={plugin.enabled}
        />
      ))}
    </div>
  );
}

type PluginRowProps = {
  plugin: ActualPluginStored;
  enabled: boolean;
};
function PluginRow({ plugin, enabled }: PluginRowProps) {
  const [removeConfirmationOpen, setRemoveConfirmationOpen] = useState(false);
  const removeTriggerRef = useRef<HTMLButtonElement>(null);

  const [pauseConfirmationOpen, setPauseConfirmationOpen] = useState(false);
  const pauseTriggerRef = useRef<HTMLButtonElement>(null);

  const { refreshPluginStore, plugins, pluginStore } = useActualPlugins();
  const isSyncServerPlugin = plugin.source === 'sync-server';

  return (
    <Row
      height="auto"
      style={{
        fontSize: 13,
        backgroundColor: theme.tableBackground,
      }}
      collapsed={true}
    >
      <Cell name="name" width={180} plain style={{ color: theme.tableText }}>
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
          }}
        >
          {plugin.name}
        </View>
      </Cell>
      <Cell name="version" width={80} plain style={{ color: theme.tableText }}>
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
          }}
        >
          {plugin.version}
        </View>
      </Cell>
      <Cell name="url" width="flex" plain style={{ color: theme.tableText }}>
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
          }}
        >
          {plugin.url}
        </View>
      </Cell>
      <Cell name="state" width={100} plain style={{ color: theme.tableText }}>
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {enabled ? t('Running') : ''}
        </View>
      </Cell>
      <Cell
        name="description"
        width="flex"
        plain
        style={{ color: theme.tableText }}
      >
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
          }}
        >
          {plugin.description}
        </View>
      </Cell>
      <Cell name="actions" width={100} plain style={{ color: theme.tableText }}>
        <View
          style={{
            flexDirection: 'row',
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
            gap: 8,
          }}
        >
          {isSyncServerPlugin ? (
            <span style={{ color: theme.pageTextSubdued, fontSize: 11 }}>
              <Trans>Server managed</Trans>
            </span>
          ) : (
            <>
              <Button
                ref={pauseTriggerRef}
                variant="bare"
                onPress={() => setPauseConfirmationOpen(true)}
              >
                {plugin.enabled ? (
                  <SvgPause style={{ width: 16, height: 16 }} />
                ) : (
                  <SvgPlay style={{ width: 16, height: 16 }} />
                )}
              </Button>
              <SmallConfirmationWindow
                question={t(
                  "Are you sure you want to {{newstate}} the plugin '{{plugin}}'",
                  {
                    newstate: plugin.enabled ? 'disable' : 'enable',
                    plugin: plugin.name,
                  },
                )}
                popoverRef={pauseTriggerRef as RefObject<HTMLElement>}
                isOpen={pauseConfirmationOpen}
                onYes={async () => {
                  const loadedPlugin = pluginStore.find(
                    p => p.name === plugin.name,
                  );
                  if (loadedPlugin?.plugin) {
                    await persistPlugin(loadedPlugin.plugin, {
                      ...loadedPlugin,
                      enabled: plugin.enabled ? false : true,
                    });
                    await refreshPluginStore();
                    window.location.reload();
                  }
                  setPauseConfirmationOpen(false);
                }}
                onNo={() => setPauseConfirmationOpen(false)}
              />

              <Button
                ref={removeTriggerRef}
                variant="bare"
                style={{ color: theme.errorText }}
                onPress={() => setRemoveConfirmationOpen(true)}
              >
                <SvgTrash style={{ width: 16, height: 16 }} />
              </Button>
              <SmallConfirmationWindow
                question={t(
                  "Are you sure you want to delete the plugin '{{name}}'",
                  { name: plugin.name },
                )}
                popoverRef={removeTriggerRef as RefObject<HTMLElement>}
                isOpen={removeConfirmationOpen}
                onYes={async () => {
                  const loadedPlugin = plugins.find(
                    p => p.name === plugin.name,
                  );
                  if (loadedPlugin) {
                    await removePlugin(plugin);
                    await refreshPluginStore();
                    window.location.reload();
                  }
                }}
                onNo={() => setRemoveConfirmationOpen(false)}
              />
            </>
          )}
        </View>
      </Cell>
    </Row>
  );
}

type SmallConfirmationWindowProps = {
  question: string;
  popoverRef?: RefObject<HTMLElement>;
  isOpen?: boolean;
  onYes?: () => void;
  onNo?: () => void;
};

function SmallConfirmationWindow({
  question,
  popoverRef,
  isOpen,
  onYes,
  onNo,
}: SmallConfirmationWindowProps) {
  return (
    <Popover
      triggerRef={popoverRef}
      isOpen={isOpen}
      onOpenChange={onNo}
      style={{ padding: 16 }}
    >
      <View style={{ align: 'center' }}>
        <Text style={{ marginBottom: 5 }}>{question}</Text>
      </View>

      <Stack
        direction="row"
        justify="flex-end"
        align="center"
        style={{ marginTop: 15 }}
      >
        <View style={{ flex: 1 }} />
        <Button variant="primary" autoFocus onPress={onYes}>
          <Trans>Yes</Trans>
        </Button>
        <Button variant="primary" onPress={onNo}>
          <Trans>No</Trans>
        </Button>
      </Stack>
    </Popover>
  );
}

function PluginUploader() {
  const { plugins, refreshPluginStore } = useActualPlugins();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await installPluginFromZipFile(plugins, file);
      await refreshPluginStore();
      dispatch(
        addNotification({
          notification: {
            title: 'Manual plugin install',
            message: 'Plugin installed sucessfully!',
            type: 'message',
          },
        }),
      );
    } catch (error: unknown) {
      console.error(error);
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            title: 'Error installing plugin',
            message: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    } finally {
      e.target.value = '';
    }
  };

  return (
    <View style={{ flexDirection: 'row' }}>
      <Button onPress={() => fileInputRef.current?.click()} variant="normal">
        <Trans>Upload plugin manually</Trans>
      </Button>

      <Input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </View>
  );
}
