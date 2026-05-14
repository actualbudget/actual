import { type ReactNode } from 'react';

import type { Preview } from '@storybook/react-vite';

// Not ideal to import from desktop-client, but we need a source of truth for theme variables
// TODO: this needs refactoring
// oxlint-disable-next-line actual/enforce-boundaries
import paletteCss from '../../desktop-client/src/style/palette.css?inline';
// oxlint-disable-next-line actual/enforce-boundaries
import darkThemeCss from '../../desktop-client/src/style/themes/dark.css?inline';
// oxlint-disable-next-line actual/enforce-boundaries
import lightThemeCss from '../../desktop-client/src/style/themes/light.css?inline';
// oxlint-disable-next-line actual/enforce-boundaries
import midnightThemeCss from '../../desktop-client/src/style/themes/midnight.css?inline';

const THEMES = {
  light: lightThemeCss,
  dark: darkThemeCss,
  midnight: midnightThemeCss,
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

  return (
    <div>
      <style>{paletteCss}</style>
      <style>{THEMES[themeName]}</style>
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
