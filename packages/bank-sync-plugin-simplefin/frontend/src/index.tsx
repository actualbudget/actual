import * as React from 'react';
import { I18nextProvider } from 'react-i18next';

import { initializePlugin } from '@actual-app/plugins-core';
import type {
  ActualPlugin,
  ActualPluginEntry,
  PluginContext,
} from '@actual-app/plugins-core';

import { manifest } from '../../src/manifest';

import { SimpleFinSetup } from './SimpleFinSetup';

const pluginEntry: ActualPluginEntry = () => {
  const plugin: ActualPlugin = {
    name: manifest.name,
    version: manifest.version,
    install() {},
    uninstall() {},
    activate(context: PluginContext) {
      const I18nWrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nextProvider i18n={context.i18nInstance}>
          {children}
        </I18nextProvider>
      );

      console.debug('[simplefin-plugin] registering bank-sync setup UI', {
        providerSlug: manifest.name,
      });

      return context.registerBankSyncProviderSetup(
        manifest.name,
        props => {
          console.debug('[simplefin-plugin] rendering setup UI', {
            providerSlug: props.providerSlug,
          });

          return (
            <I18nWrapper>
              <SimpleFinSetup {...props} />
            </I18nWrapper>
          );
        },
        {
          containerProps: {
            style: { width: 300 },
          },
        },
      );
    },
    deactivate() {},
  };

  return initializePlugin(plugin);
};

export default pluginEntry;
