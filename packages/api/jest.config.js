module.exports = {
  moduleFileExtensions: [
    'testing.js',
    'testing.ts',
    'api.js',
    'api.ts',
    'api.tsx',
    'electron.js',
    'electron.ts',
    'mjs',
    'js',
    'ts',
    'tsx',
    'json',
  ],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/'],
  watchPathIgnorePatterns: ['<rootDir>/mocks/budgets/'],
  setupFilesAfterEnv: ['<rootDir>/../loot-core/src/mocks/setup.ts'],
  transformIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
};
