import React from 'react'; // This is reuqired for JSX syntax

import type { Preview } from '@storybook/react-vite';

// Not ideal to import from desktop-client, but we need a source of truth for theme variables
import * as lightTheme from '../../desktop-client/src/style/themes/light';

const Theme = () => {
  const css = Object.entries(lightTheme)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
};

const preview: Preview = {
  decorators: [
    Story => (
      <>
        <Theme />
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
