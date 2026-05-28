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
  android: {
    // Cross-origin isolation (for SharedArrayBuffer) is added by the custom
    // WebViewClient in COEPWebViewClient.kt; without it the app falls back to
    // the slower no-SharedArrayBuffer path automatically.
    allowMixedContent: false,
  },
  server: {
    // iOS serves bundled assets from capacitor://localhost; Android from
    // https://localhost. The native COOP/COEP injectors
    // (COEPSchemeHandler.swift / COEPWebViewClient.kt) stamp the headers so
    // `crossOriginIsolated` is true on each platform.
    iosScheme: 'capacitor',
    androidScheme: 'https',
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
