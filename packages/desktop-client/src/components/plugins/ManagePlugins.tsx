import { type RefObject, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgPause,
  SvgPlay,
  SvgTrash,
  SvgWrench,
} from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Popover } from '@actual-app/components/popover';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { t } from 'i18next';

import { pushModal } from 'loot-core/client/modals/modalsSlice';
import {
  addNotification,
  addUnknownErrorNotification,
} from 'loot-core/client/notifications/notificationsSlice';
import { type ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';

import { useActualPlugins } from '../../plugin/ActualPluginsProvider';
import {
  checkForNewPluginRelease,
  fetchRelease,
  parseGitHubRepoUrl,
} from '../../plugin/core/githubUtils';
import {
  installPluginFromManifest,
  installPluginFromZipFile,
} from '../../plugin/core/pluginInstaller';
import { persistPlugin, removePlugin } from '../../plugin/core/pluginStore';
import { useDispatch } from '../../redux';
import { InfiniteScrollWrapper } from '../common/InfiniteScrollWrapper';
import { Link } from '../common/Link';
import { Cell, Row } from '../table';

import { PluginsHeader } from './PluginsHeader';

export function ManagePlugins() {
  const devPlugin = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { pluginStore, plugins, refreshPluginStore } = useActualPlugins();
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
            {t(
              'Manage and configure plugins to enhance functionality and efficiency.',
            )}{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/experimental/plugins/"
              linkColor="muted"
            >
              {t('Learn more')}
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
        <Button
          variant="normal"
          onPress={async () => {
            for (const plugin of pluginStore) {
              const result = await checkForNewPluginRelease(
                plugin.url,
                plugin.version,
              );
              if (result.hasNewVersion) {
                dispatch(
                  addNotification({
                    notification: {
                      message: `New version found for ${plugin.name}: ${result.latestVersion} (Current installed version: ${plugin.version})`,
                      sticky: true,
                      type: 'message',
                      button: {
                        title: t(
                          'Update {{pluginName}} to version {{latestVersion}}',
                          {
                            pluginName: plugin.name,
                            latestVersion: result.latestVersion,
                          },
                        ),
                        action: async () => {
                          try {
                            const parsedRepo = parseGitHubRepoUrl(plugin.url);
                            if (parsedRepo == null) {
                              throw new Error(
                                `Plugin url '${plugin.url}' could not be parsed`,
                              );
                            } else {
                              const { manifestUrl } = await fetchRelease(
                                parsedRepo.owner,
                                parsedRepo.repo,
                                `tags/${result.latestVersion}`,
                              );
                              const manifestResponse = await fetch(
                                `http://localhost:5006/cors-proxy?url=${manifestUrl}`,
                              );
                              if (manifestResponse.ok) {
                                await installPluginFromManifest(
                                  plugins,
                                  await manifestResponse.json(),
                                );
                                await refreshPluginStore();
                                window.location.reload();
                              } else {
                                throw new Error(
                                  `Plugin manifest response was '${await manifestResponse.text()}'`,
                                );
                              }
                            }
                          } catch (error) {
                            dispatch(
                              addUnknownErrorNotification({
                                notification: {
                                  type: 'error',
                                  error,
                                },
                              }),
                            );
                          }
                        },
                      },
                    },
                  }),
                );
              } else {
                dispatch(
                  addNotification({
                    notification: {
                      message: `${plugin.name} is already in latest version`,
                      sticky: false,
                      type: 'message',
                    },
                  }),
                );
              }
            }
          }}
        >
          <Trans>Check for updates</Trans>
        </Button>
        <PluginUploader />
        {/* <Button variant="normal" isDisabled onPress={() => {}}>
          <Trans>Upload plugin manually</Trans>
        </Button> */}
        <Button
          variant="primary"
          onPress={() =>
            dispatch(
              pushModal({
                modal: {
                  name: 'select-new-plugin',
                  options: {
                    onSave: async () => {},
                  },
                },
              }),
            )
          }
        >
          {t('Add new plugin')}
        </Button>
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
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Input
          style={{ flex: 1 }}
          inputRef={devPlugin}
          value="http://localhost:2000/mf-manifest.json"
        />{' '}
        <Button
          variant="primary"
          onPress={() => {
            refreshPluginStore(devPlugin.current?.value);
          }}
        >
          Enable Dev Plugin
        </Button>
      </View>
    </View>
  );
}

function PluginList() {
  const { pluginStore } = useActualPlugins();
  return (
    <>
      {pluginStore.map(plugin => (
        <PluginRow
          key={`${plugin.name}-${plugin.version}`}
          plugin={plugin}
          enabled={plugin.enabled}
        />
      ))}
    </>
  );
}

type PluginRowProps = {
  plugin: ActualPluginStored;
  enabled: boolean;
};
function PluginRow({ plugin, enabled }: PluginRowProps) {
  const dispatch = useDispatch();
  const [removeConfirmationOpen, setRemoveConfirmationOpen] = useState(false);
  const removeTriggerRef = useRef<HTMLButtonElement>(null);

  const [pauseConfirmationOpen, setPauseConfirmationOpen] = useState(false);
  const pauseTriggerRef = useRef<HTMLButtonElement>(null);

  const { refreshPluginStore, plugins, pluginStore } = useActualPlugins();

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
      <Cell name="version" width={60} plain style={{ color: theme.tableText }}>
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
          {enabled ? 'Running' : ''}
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
      <Cell name="actions" width={120} plain style={{ color: theme.tableText }}>
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
          {plugin.config?.length && (
            <Button
              variant="bare"
              onPress={() => {
                dispatch(
                  pushModal({
                    modal: {
                      name: 'configure-plugin',
                      options: {
                        plugin,
                      },
                    },
                  }),
                );
              }}
            >
              <SvgWrench style={{ width: 16, height: 16 }} />
            </Button>
          )}
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
              'Are you sure you want to {{newstate}} the plugin ‘{{plugin}}‘',
              {
                newstate: plugin.enabled ? 'disable' : 'enable',
                plugin: plugin.name,
              },
            )}
            popoverRef={pauseTriggerRef}
            isOpen={pauseConfirmationOpen}
            onYes={async () => {
              const loadedPlugin = pluginStore.find(
                p => p.name === plugin.name,
              );
              if (loadedPlugin) {
                persistPlugin(loadedPlugin.plugin, {
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
              'Are you sure you want to delete the plugin ‘{{name}}‘',
              { name: plugin.name },
            )}
            popoverRef={removeTriggerRef}
            isOpen={removeConfirmationOpen}
            onYes={async () => {
              const loadedPlugin = plugins.find(p => p.name === plugin.name);
              if (loadedPlugin) {
                loadedPlugin.uninstall?.();
                removePlugin(plugin);
                await refreshPluginStore();
                window.location.reload();
              }
            }}
            onNo={() => setRemoveConfirmationOpen(false)}
          />
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        addUnknownErrorNotification({
          notification: {
            title: 'Error installing plugin',
            error,
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
        Upload plugin manually
      </Button>

      <Input
        inputRef={fileInputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </View>
  );
}
