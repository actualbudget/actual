const { getDefaultConfig } = require('metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig();

  return {
    transformer: {},
    resolver: {
      sourceExts: ['mobile.js', 'js', 'ts', 'tsx', 'json'],
      blacklistRE: exclusionList([
        /nodejs-assets\/.*/,
        /android\/.*/,
        /ios\/.*/
      ]),
      extraNodeModules: {
        'react-native-svg': path.resolve(
          __dirname,
          'node_modules/react-native-svg'
        ),
        'react-native-gesture-handler': path.resolve(
          __dirname,
          'node_modules/react-native-gesture-handler'
        ),
        'react-native-reanimated': path.resolve(
          __dirname,
          'node_modules/react-native-reanimated'
        ),
        'react-native-sentry': path.resolve(
          __dirname,
          'node_modules/react-native-sentry'
        ),
        'react-native-status-bar-height': path.resolve(
          __dirname,
          'node_modules/react-native-status-bar-height'
        ),
        'react-native': path.resolve(__dirname, 'node_modules/react-native')
      }
    },
    watchFolders: [path.join(__dirname, '../../')]
  };
})();
