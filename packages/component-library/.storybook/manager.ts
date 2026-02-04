import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

// Colors from the Actual Budget light theme palette
const purple500 = '#8719e0';
const purple400 = '#9a3de8';
const navy900 = '#102a43';
const navy700 = '#334e68';
const navy600 = '#486581';
const navy150 = '#d9e2ec';
const navy100 = '#e8ecf0';
const white = '#ffffff';

// Create a custom Storybook theme matching Actual Budget's light theme
const theme = create({
  base: 'light',
  brandTitle: 'Actual Budget',
  brandUrl: 'https://actualbudget.org',
  brandImage: 'https://actualbudget.org/img/actual.webp',
  brandTarget: '_blank',

  // UI colors
  colorPrimary: purple500,
  colorSecondary: purple400,

  // App chrome
  appBg: navy100,
  appContentBg: white,
  appPreviewBg: white,
  appBorderColor: navy150,
  appBorderRadius: 4,

  // Fonts
  fontBase:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontCode: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',

  // Text colors
  textColor: navy900,
  textInverseColor: white,
  textMutedColor: navy600,

  // Toolbar
  barTextColor: navy700,
  barHoverColor: purple500,
  barSelectedColor: purple500,
  barBg: white,

  // Form colors
  buttonBg: white,
  buttonBorder: navy900,
  booleanBg: navy150,
  booleanSelectedBg: purple500,
  inputBg: white,
  inputBorder: navy900,
  inputTextColor: navy900,
  inputBorderRadius: 4,
});

addons.setConfig({
  theme,
  enableShortcuts: true,
  isFullscreen: false,
  isToolshown: true,
  sidebar: {
    collapsedRoots: [],
    filters: {
      patterns: item => {
        // Hide stories that are marked as internal
        return !item.tags?.includes('internal');
      },
    },
  },
});
