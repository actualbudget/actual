module.exports = {
  moduleFileExtensions: ['js', 'json', 'testing.js'],
  setupTestFrameworkScriptFile: './test/setup.js',
  testEnvironment: 'node',
  rootDir: '../',
  transform: {
    '^.+\\.js?$': '@swc/jest'
  }
};
