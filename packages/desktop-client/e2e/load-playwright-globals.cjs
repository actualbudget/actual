'use strict';

const { createRequire } = require('module');
const path = require('path');

const requireFromHere = createRequire(__filename);
const playwrightRoot = path.dirname(
  requireFromHere.resolve('playwright/package.json'),
);

module.exports = requireFromHere(
  path.join(playwrightRoot, 'lib/common/globals.js'),
);
