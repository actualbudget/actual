import { type ReactNode } from 'react';

import type { Preview } from '@storybook/react-vite';

// Not ideal to import from desktop-client, but we need a source of truth for theme variables
import * as darkTheme from '../../desktop-client/src/style/themes/dark';
import * as developmentTheme from '../../desktop-client/src/style/themes/development';
import * as lightTheme from '../../desktop-client/src/style/themes/light';
import * as midnightTheme from '../../desktop-client/src/style/themes/midnight';

const THEMES = {
  light: lightTheme,
  dark: darkTheme,
  midnight: midnightTheme,
  development: developmentTheme,
} as const;

type ThemeName = keyof typeof THEMES;

const ThemedStory = ({
  themeName,
  children,
}: {
  themeName?: ThemeName;
  children?: ReactNode;
}) => {
  if (!themeName || !THEMES[themeName]) {
    throw new Error(`No theme specified`);
  }

  const css = Object.entries(THEMES[themeName])
    .map(([key, value]) => `--color-${key}: ${value};`)
    .join('\n');

  return (
    <div>
      <style>{`:root {\n${css}}`}</style>
      {children}
    </div>
  );
};

const preview: Preview = {
  decorators: [
    (Story, { globals }) => {
      const themeName = globals.theme;

      return (
        <ThemedStory themeName={themeName}>
          <Story />
        </ThemedStory>
      );
    },
  ],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'midnight', title: 'Midnight' },
          { value: 'development', title: 'Development' },
        ],
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
