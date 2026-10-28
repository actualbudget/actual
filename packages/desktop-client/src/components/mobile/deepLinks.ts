// Deep links the native mobile app can be opened with, such as the
// `actualbudget://` link of the iOS home screen widget (registered in
// packages/mobile-client/ios/App/App/Info.plist). The native app reports them
// through Capacitor's `App` plugin; the web build has no dependency on
// @capacitor/core, so the plugin is reached through the `window.Capacitor`
// global the native runtime injects, and everything is a no-op without it.

type PluginListenerHandle = { remove: () => Promise<void> };

export type AppPlugin = {
  addListener: (
    eventName: 'appUrlOpen',
    listener: (event: { url: string }) => void,
  ) => Promise<PluginListenerHandle>;
};

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    /** Injected by the Capacitor native runtime; absent in browsers. */
    Capacitor?: {
      isNativePlatform: () => boolean;
      registerPlugin: <T>(name: string) => T;
    };
  }
}

/** Capacitor's `App` plugin in the native app, null everywhere else. */
export function getAppPlugin(): AppPlugin | null {
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform()) {
    return null;
  }
  return capacitor.registerPlugin<AppPlugin>('App');
}

/** The links the app accepts, and the route each one opens. */
const DEEP_LINK_ROUTES: Record<string, string> = {
  'actualbudget://transactions/new': '/transactions/new',
};

export function routeForAppUrl(url: string): string | null {
  return DEEP_LINK_ROUTES[url] ?? null;
}
