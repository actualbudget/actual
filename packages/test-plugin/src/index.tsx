import * as React from 'react';
import { Trans, I18nextProvider } from 'react-i18next';

import {
  ActualPlugin,
  ActualPluginEntry,
  PluginContext,
  Button,
  initializePlugin,
  View,
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/plugins-core';

import { ClickMeButton } from './ClickMeButton';
import { DummyItemsDashboardWidget } from './DashboardWidget';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { ModalHelloWorld } from './ModalHelloWorld';
import { ModalSchedules } from './ModalSchedules';
import { sepiaVintageTheme } from './theme';

let pluginContext: PluginContext;

const pluginEntry: ActualPluginEntry = () => {
  const plugin: ActualPlugin = {
    name: manifest.name,
    version: manifest.version,
    uninstall: () => {},
    migrations: () => migrations,
    activate: (context: PluginContext) => {
      pluginContext = context;

      const I18nWrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nextProvider i18n={context.i18nInstance}>
          {children}
        </I18nextProvider>
      );

      // Add sepia themed style
      context.addTheme('sepia-vintage', 'Sepia Vintage', sepiaVintageTheme, {
        baseTheme: 'light',
        description:
          'A warm, vintage sepia-toned theme that evokes the classic look of old photographs',
      });

      // Register dashboard widget
      context.registerDashboardWidget(
        'dummy-items-summary',
        'Dummy Items Summary',
        <I18nWrapper>
          <DummyItemsDashboardWidget context={pluginContext} />
        </I18nWrapper>,
        {
          defaultWidth: 4,
          defaultHeight: 3,
          minWidth: 3,
          minHeight: 2,
        },
      );

      // Seed initial data if db is available
      if (context.db) {
        seedDummyData(context.db);
      }

      context.on(
        'categories',
        (data: {
          categories: CategoryEntity[];
          groups: CategoryGroupEntity[];
        }) => {
          // Handle categories data
          console.log('In test-plugin, categories data:', data);
        },
      );
      context.registerRoute(
        '/test',
        <I18nWrapper>
          <View>Simple JSX 2</View>
        </I18nWrapper>,
      );
      context.registerMenu(
        'before-accounts',
        <ClickMeButton context={pluginContext} />,
      );
      context.registerMenu(
        'after-accounts',
        <I18nWrapper>
          <Button
            onPress={() => {
              context.pushModal(
                <I18nWrapper>
                  <ModalHelloWorld
                    text="Database Demo"
                    context={pluginContext}
                  />
                </I18nWrapper>,
              );
            }}
            variant="primary"
          >
            <Trans>Show Database Data</Trans>
          </Button>
        </I18nWrapper>,
      );
      context.registerMenu(
        'after-accounts',
        <I18nWrapper>
          <Button
            onPress={() => {
              context.pushModal(
                <I18nWrapper>
                  <ModalSchedules context={pluginContext} />
                </I18nWrapper>,
              );
            }}
            variant="primary"
          >
            Show Schedules (AQL)
          </Button>
        </I18nWrapper>,
      );
    },
  };

  return initializePlugin(plugin);
};

// Export the plugin entry as default
export default pluginEntry;

// Seed some initial data
async function seedDummyData(db: NonNullable<PluginContext['db']>) {
  try {
    // Check if data already exists
    const existingData = (await db.runQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM dummy_items',
      [],
      true,
    )) as { count: number }[];

    if (
      existingData &&
      Array.isArray(existingData) &&
      existingData[0]?.count === 0
    ) {
      // Insert sample data
      await db.runQuery(
        'INSERT INTO dummy_items (name, description, value) VALUES (?, ?, ?)',
        ['Sample Item 1', 'This is the first dummy item', 29.99],
      );

      await db.runQuery(
        'INSERT INTO dummy_items (name, description, value) VALUES (?, ?, ?)',
        ['Sample Item 2', 'This is the second dummy item', 45.5],
      );

      await db.runQuery(
        'INSERT INTO dummy_items (name, description, value) VALUES (?, ?, ?)',
        ['Sample Item 3', 'This is the third dummy item', 12.75],
      );

      // Dummy data seeded successfully
    }
  } catch {
    // Handle error silently
  }
}
