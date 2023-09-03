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
  setupFilesAfterEnv: ['<rootDir>/src/mocks/setup.ts'],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '.+/index\\.web\\.test\\.(js|ts|tsx)',
  ],
  transformIgnorePatterns: ['/node_modules/'],
  transform: {
    '\\.pegjs$': '<rootDir>/peg-transform.mjs',
  },
};
