module.exports = {
  moduleFileExtensions: ['testing.js', 'web.js', 'mjs', 'js', 'json'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/lib/'].filter(Boolean),
  testMatch: ['**/*.web.test.js'],
  transformIgnorePatterns: [
    '__mocks__',
    '/node_modules/(?!perf-deets|absurd-sql)'
  ],
  transform: {
    '^.+\\.(js|ts|tsx)?$': '@swc/jest'
  },
  globals: {
    __TESTING__: true
  }
};
