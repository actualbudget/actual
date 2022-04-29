import { Platform } from 'react-native';
export default {
  // Simulate ios on the web
  OS: Platform.OS === 'web' ? 'ios' : Platform.OS,
  env: 'mobile',
  isReactNativeWeb: Platform.OS === 'web'
};
