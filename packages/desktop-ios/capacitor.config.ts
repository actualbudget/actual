import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.actualbudget.app',
  appName: 'Actual',
  // Populated by `bin/stage-webdir.mjs` from packages/desktop-client/build.
  webDir: 'webdir',
  ios: {
    scheme: 'Actual',
    contentInset: 'always',
    // Required for SharedArrayBuffer / cross-origin isolation inside WKWebView.
    // The app only ever loads its bundled assets from the custom scheme, so
    // restricting navigation to app-bound domains is both safe and necessary.
    limitsNavigationsToAppBoundDomains: true,
  },
  server: {
    // Serve the bundled web assets from capacitor://localhost (the default).
    // The custom WKURLSchemeHandler in COEPSchemeHandler.swift stamps the
    // COOP/COEP headers on these responses so `crossOriginIsolated` is true.
    iosScheme: 'capacitor',
  },
  plugins: {
    // Auto-hide after the web layer has had time to paint. Driven entirely by
    // config so desktop-client never needs to import a Capacitor plugin (which
    // would break the web/electron bundles).
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#5c3dbb',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
