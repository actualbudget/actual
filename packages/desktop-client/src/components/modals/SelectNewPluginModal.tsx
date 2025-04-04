// SelectNewPluginModal.tsx
import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Card } from '@actual-app/components/card';
import { SvgCheck } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { type ActualPluginManifest } from '@actual-app/plugins-core';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { useActualPlugins } from '@desktop-client/plugin/ActualPluginsProvider';
import { loadAllowListPlugins } from '@desktop-client/plugin/core/githubUtils';
import { installPluginFromManifest } from '@desktop-client/plugin/core/pluginInstaller';

type SelectNewPluginModalProps = {
  onSave: () => void;
};

type AllowListPlugin = {
  url: string;
  version: string;
  manifest?: ActualPluginManifest;
  error?: string;
  loading: boolean;
};

export function SelectNewPluginModal({ onSave }: SelectNewPluginModalProps) {
  const { t } = useTranslation();
  const [pluginsListLoading, setPluginsListLoading] = useState(true);
  const [whiteListPlugins, setAllowListPlugins] = useState<AllowListPlugin[]>(
    [],
  );
  const [selectedPlugin, setSelectedPlugin] = useState<AllowListPlugin | null>(
    null,
  );
  const { plugins, refreshPluginStore, pluginStore } = useActualPlugins();

  useEffect(() => {
    refreshPluginStore().then(async () => {
      try {
        const plugins = await loadAllowListPlugins();
        setAllowListPlugins(plugins);
      } catch (error) {
        console.error('Error fetching plugin list:', error);
      } finally {
        setPluginsListLoading(false);
      }
    });
  }, [refreshPluginStore]);

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
                          <Trans>Error</Trans>: {plugin.error}
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
                    <Trans>Install selected plugin</Trans>
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
