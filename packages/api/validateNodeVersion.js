import { satisfies } from 'compare-versions';

import * as packageJson from './package.json';

export function validateNodeVersion() {
  if (process?.versions?.node) {
    const nodeVersion = process?.versions?.node;
    const minimumNodeVersion = packageJson.engines.node;

    if (!satisfies(nodeVersion, minimumNodeVersion)) {
      throw new Error(
        `@actual-app/api requires a node version ${minimumNodeVersion}. Found that you are using: ${nodeVersion}. Please upgrade to a higher version`,
      );
    }
  }
}
