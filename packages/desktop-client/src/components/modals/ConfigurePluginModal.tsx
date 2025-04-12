import React from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { Input } from '@actual-app/components/input';
import { View } from '@actual-app/components/view';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { Modal } from '../common/Modal';
import { ActualPluginConfigField } from 'plugins-core/index';
import { usePluginConfig } from '../../plugin/core/hooks';

type ConfigurePluginModalProps = Extract<
  ModalType,
  { name: 'configure-plugin' }
>['options'];

export function ConfigurePluginModal({ plugin }: ConfigurePluginModalProps) {
  const { isNarrowWidth } = useResponsive();
  const { config, setConfig, saveConfig } = usePluginConfig(plugin);

  return (
    <Modal name="configure-plugin">
      {({ state: { close } }) => (
        <>
          <View>
            {plugin.config?.map(field => (
              <PluginConfigField
                key={field.name}
                pluginField={field}
                value={config?.[field.name] ?? ''}
                onChange={(v: string) =>
                  setConfig({ ...config, [field.name]: v })
                }
              />
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
            }}
          >
            <Button
              style={{
                marginRight: 10,
                height: isNarrowWidth ? styles.mobileMinHeight : undefined,
              }}
              onPress={close}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button
              type="submit"
              variant="primary"
              style={{
                height: isNarrowWidth ? styles.mobileMinHeight : undefined,
              }}
              onPress={async () => {
                await saveConfig();
                close();
              }}
            >
              <Trans>Save</Trans>
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}

type PluginConfigFieldProps = {
  pluginField: ActualPluginConfigField;
  value: string;
  onChange: (value: string) => void;
};

function PluginConfigField({
  pluginField: { name, title },
  value,
  onChange,
}: PluginConfigFieldProps) {
  const displayName = title ?? name;
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-between',
        width: '100%',
      }}
    >
      <Trans>{displayName}</Trans>
      <View>
        <Input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </View>
    </View>
  );
}
