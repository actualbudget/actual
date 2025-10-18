import type { CapacitorConfig } from '@capacitor/cli';

const baseConfig: CapacitorConfig = {
  appId: 'org.actualbudget',
  appName: 'Actual Budget',
  webDir: '../desktop-client/build',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true,
      directUpdate: 'always',
      autoSplashscreen: true,
      keepUrlPathAfterReload: true,
      allowModifyUrl: true,
      persistCustomId: true,
      publicKey: '',
      statsUrl: '',
    },
    SplashScreen: {
      launchAutoHide: false,
    },
  },
};

const devConfig: CapacitorConfig = {
  ...baseConfig,
  android: {
    ...baseConfig.android,
    allowMixedContent: true,
  },
  server: {
    cleartext: true,
    // Put in http://10.0.2.2:5006 for Android emulator to access server running on local machine.
    allowNavigation: ['localhost', '10.0.2.2'],
  },
};

// NODE_ENV is unset in development, 'production' in production builds.
const config: CapacitorConfig =
  process.env.NODE_ENV === 'production' ? baseConfig : devConfig;

// https://capacitorjs.com/docs/config
// eslint-disable-next-line import/no-default-export
export default config;
