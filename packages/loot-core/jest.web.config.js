module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
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
  testMatch: ['**/*.web.test.[tj]sx?'],
  transformIgnorePatterns: ['__mocks__', '/node_modules/(?!absurd-sql)'],
  transform: {
    '\\.pegjs$': 'pegjs-jest-transformer',
  },
};
