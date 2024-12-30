import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { type ActualPluginManifest } from '../../../../plugins-shared/src';
import { SvgCheck } from '../../icons/v2';
import { theme } from '../../style';
import {
  fetchRelease,
  installPluginFromManifest,
  parseGitHubRepoUrl,
  useActualPlugins,
} from '../ActualPluginsProvider';
import { Button } from '../common/Button2';
import { Card } from '../common/Card';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { LoadingIndicator } from '../reports/LoadingIndicator';

type SelectNewPluginModalProps = {
  onSave: () => void;
};

type WhiteListPlugin = {
  url: string;
  version: string;
  manifest?: ActualPluginManifest;
  error?: string;
  loading: boolean;
};

export function SelectNewPluginModal({ onSave }: SelectNewPluginModalProps) {
  const { t } = useTranslation();
  const [pluginsListLoading, setPluginsListLoading] = useState(true);
  const [whiteListPlugins, setWhiteListPlugins] = useState<WhiteListPlugin[]>(
    [],
  );
  const [selectedPlugin, setSelectedPlugin] = useState<WhiteListPlugin | null>(
    null,
  );
  const { plugins, refreshPluginStore, pluginStore } = useActualPlugins();

  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/actual-plugins/whitelist/refs/heads/main/plugins.json',
        );
        if (response.ok) {
          const plugins = (await response.json()) as WhiteListPlugin[];
          const updatedPlugins = await Promise.all(
            plugins.map(async plugin => {
              plugin.loading = true;
              const parsedRepo = parseGitHubRepoUrl(plugin.url);
              if (parsedRepo == null) {
                throw new Error(`Invalid repo ${plugin.url}`);
              }

              try {
                const { manifestUrl } = await fetchRelease(
                  parsedRepo.owner,
                  parsedRepo.repo,
                  `tags/${plugin.version}`,
                );
                const manifestResponse = await fetch(
                  `https://cors-anywhere.herokuapp.com/${manifestUrl}`,
                );
                if (manifestResponse.ok) {
                  plugin.manifest = await manifestResponse.json();
                }
              } catch (error) {
                if (error && typeof error == 'object') {
                  plugin.error = error.toString();
                } else {
                  plugin.error = 'unknown error';
                }
              } finally {
                plugin.loading = false;
              }
              return plugin;
            }),
          );
          setWhiteListPlugins(updatedPlugins);
        }
      } catch (error) {
        console.error('Error fetching plugin list:', error);
      } finally {
        setPluginsListLoading(false);
      }
    };

    fetchPlugins();
  }, []);

  async function _onSave() {
    if (selectedPlugin && selectedPlugin.manifest) {
      await installPluginFromManifest(plugins, selectedPlugin.manifest);
      await refreshPluginStore();
    }
    onSave();
  }

  return (
    <Modal
      name="select-new-plugin"
      containerProps={{
        style: { height: '90vh', width: '90vw' },
      }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Select a Plugin to install')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          {pluginsListLoading ? (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ color: theme.formLabelText }}>
                <Trans>Loading plugin list...</Trans>
              </Text>
              <LoadingIndicator />
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: 'column' }}>
              <View
                style={{
                  flexGrow: 1,
                  width: '100%',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                }}
              >
                {whiteListPlugins.map(plugin => (
                  <Card
                    key={`${plugin.url}-${plugin.version}`}
                    onClick={() => {
                      if (
                        pluginStore.some(p => p.name === plugin.manifest?.name)
                      ) {
                        return;
                      }

                      if (selectedPlugin === plugin) {
                        setSelectedPlugin(null);
                      } else if (plugin.manifest) {
                        setSelectedPlugin(plugin);
                      }
                    }}
                    style={{
                      padding: 6,
                      minWidth: 250,
                      maxWidth: 250,
                      height: 250,
                      backgroundColor: pluginStore.some(
                        p => p.name === plugin.manifest?.name,
                      )
                        ? theme.buttonPrimaryDisabledBackground
                        : selectedPlugin === plugin
                          ? theme.buttonNormalSelectedBackground
                          : theme.tableBackground,
                      cursor: pluginStore.some(
                        p => p.name === plugin.manifest?.name,
                      )
                        ? 'inherit'
                        : 'pointer',
                    }}
                  >
                    <View
                      style={{ width: '100%', height: '100%', flexGrow: 1 }}
                    >
                      {plugin.loading ? (
                        <View style={{ alignItems: 'center' }}>
                          <Text>
                            {plugin.url}:{plugin.version}
                          </Text>
                          <LoadingIndicator />
                        </View>
                      ) : plugin.error ? (
                        <Text style={{ color: 'red' }}>
                          {t('Error')}: {plugin.error}
                        </Text>
                      ) : (
                        <>
                          <Text
                            style={{ color: theme.formLabelText, marginTop: 4 }}
                          >
                            Plugin Name:
                          </Text>
                          <Text>{plugin.manifest?.name}</Text>
                          <Text
                            style={{ color: theme.formLabelText, marginTop: 4 }}
                          >
                            Version:
                          </Text>
                          <Text>{plugin.manifest?.version}</Text>
                          <Text
                            style={{ color: theme.formLabelText, marginTop: 4 }}
                          >
                            Description:
                          </Text>
                          <Text>{plugin.manifest?.description}</Text>
                          <Text
                            style={{ color: theme.formLabelText, marginTop: 4 }}
                          >
                            Author:
                          </Text>
                          <Text>{plugin.manifest?.author}</Text>
                          <Text
                            style={{ color: theme.formLabelText, marginTop: 4 }}
                          >
                            Repository:
                          </Text>
                          <Text>{plugin.manifest?.url}</Text>
                        </>
                      )}
                    </View>
                  </Card>
                ))}
              </View>
              <View
                style={{
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyItems: 'center',
                  width: '100%',
                  paddingTop: 10,
                }}
              >
                {selectedPlugin && (
                  <Button
                    variant="primary"
                    style={{
                      fontWeight: 400,
                    }}
                    onPress={async () => {
                      await _onSave();
                      close();
                    }}
                  >
                    <SvgCheck
                      width={17}
                      height={17}
                      style={{ paddingRight: 5 }}
                    />
                    {t('Install selected plugin')}
                  </Button>
                )}
              </View>
            </View>
          )}
        </>
      )}
    </Modal>
  );
}
