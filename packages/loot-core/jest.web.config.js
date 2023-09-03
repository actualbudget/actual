module.exports = {
  moduleFileExtensions: [
    'testing.js',
    'testing.ts',
    'web.js',
    'web.ts',
    'web.tsx',
    'mjs',
    'js',
    'ts',
    'tsx',
    'json',
  ],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/lib/'].filter(Boolean),
  testMatch: ['**/*.web.test.(js|ts|tsx)'],
  transformIgnorePatterns: ['/node_modules/(?!absurd-sql)'],
  transform: {
    '\\.pegjs$': '<rootDir>/peg-transform.mjs',
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
};
