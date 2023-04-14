module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  moduleFileExtensions: [
    'testing.js',
    'testing.ts',
    'electron.js',
    'electron.ts',
    'mjs',
    'js',
    'ts',
    'tsx',
    'json',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/mocks/setup.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '.+/index\\.web\\.test\\.(js|ts|tsx)',
  ],
  transformIgnorePatterns: ['/node_modules/'],
  // csv-stringify has some issues here
  // https://stackoverflow.com/a/71734367/1294262
  moduleNameMapper: {
    '^csv-stringify/sync':
      '<rootDir>/../../node_modules/csv-stringify/dist/cjs/sync.cjs',
    '^/kcab/node-libofx.js$': '<rootDir>/lib-dist/browser/node-libofx.js',
  },
  transform: {
    '\\.pegjs$': '<rootDir>/peg-transform.mjs',
  },
};
