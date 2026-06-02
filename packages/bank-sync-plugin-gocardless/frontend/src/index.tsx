import * as React from 'react';
import { I18nextProvider } from 'react-i18next';

import { initializePlugin } from '@actual-app/plugins-core';
import type {
  ActualPlugin,
  ActualPluginEntry,
  PluginContext,
} from '@actual-app/plugins-core';

import { manifest } from '../../src/manifest';

import { GoCardlessLink } from './GoCardlessLink';
import { GoCardlessSetup } from './GoCardlessSetup';

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

      const unregisterSetup = context.registerBankSyncProviderSetup(
        manifest.name,
        props => (
          <I18nWrapper>
            <GoCardlessSetup {...props} />
          </I18nWrapper>
        ),
        {
          containerProps: {
            style: { width: 300 },
          },
        },
      );

      const unregisterLink = context.registerBankSyncProviderLink(
        manifest.name,
        props => (
          <I18nWrapper>
            <GoCardlessLink {...props} />
          </I18nWrapper>
        ),
        {
          containerProps: {
            style: { width: 420 },
          },
        },
      );

      return () => {
        unregisterSetup();
        unregisterLink();
      };
    },
    deactivate() {},
  };

  return initializePlugin(plugin);
};

export default pluginEntry;
