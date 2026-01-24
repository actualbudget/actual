import React from 'react'; // This is reuqired for JSX syntax

import type { Preview } from '@storybook/react-vite';

import * as lightTheme from '../../desktop-client/src/style/themes/light';
import * as midnightTheme from '../../desktop-client/src/style/themes/midnight';

const RootTheme = () => {
  const css = Object.entries(lightTheme)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
};

const preview: Preview = {
  decorators: [
    Story => (
      <>
        <RootTheme />
        <Story />
      </>
    ),
  ],
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

// oxlint-disable-next-line import/no-default-export
export default preview;
