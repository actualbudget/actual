import type { StorybookConfig } from '@storybook/react-vite';

import { join, dirname } from 'path';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath("@storybook/addon-a11y")
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
};
export default config;
