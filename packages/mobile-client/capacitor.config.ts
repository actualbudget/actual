import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
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

// https://capacitorjs.com/docs/config
// eslint-disable-next-line import/no-default-export
export default config;
