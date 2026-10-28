// Bridge to the `HomeScreenWidgets` Capacitor plugin that ships with the iOS
// app (packages/mobile-client/ios/App/App/WidgetsPlugin.swift). The home
// screen widgets open the app with `actualbudget://` links, which the plugin
// forwards here to be mapped to routes.
//
// The web build has no dependency on @capacitor/core: the native runtime
// injects `window.Capacitor`, and everything is a no-op without it.

type PluginListenerHandle = { remove: () => Promise<void> };

export type HomeScreenWidgetsPlugin = {
  /** Fired with every URL the app is opened with, widget taps included. */
  addListener: (
    eventName: 'urlOpen',
    listener: (event: { url: string }) => void,
  ) => Promise<PluginListenerHandle>;
};

type CapacitorRuntime = {
  isNativePlatform: () => boolean;
  getPlatform: () => string;
  registerPlugin: <T>(name: string) => T;
};

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    /** Injected by the Capacitor native runtime; absent in browsers. */
    Capacitor?: CapacitorRuntime;
  }
}

let plugin: HomeScreenWidgetsPlugin | null = null;

/** The plugin proxy in the iOS app, null everywhere else. */
export function getHomeScreenWidgetsPlugin(): HomeScreenWidgetsPlugin | null {
  const capacitor =
    typeof window === 'undefined' ? undefined : window.Capacitor;
  if (
    !capacitor ||
    !capacitor.isNativePlatform() ||
    capacitor.getPlatform() !== 'ios'
  ) {
    return null;
  }
  plugin ??=
    capacitor.registerPlugin<HomeScreenWidgetsPlugin>('HomeScreenWidgets');
  return plugin;
}

const WIDGET_URL_SCHEME = 'actualbudget:';

/**
 * Maps a deep link opened by a widget (see `link` in
 * packages/mobile-client/ios/App/ActualWidgets/AddTransactionWidget.swift)
 * to an in-app route. Returns null for anything that is not a known widget
 * link.
 */
export function routeForWidgetUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== WIDGET_URL_SCHEME) {
    return null;
  }

  // `actualbudget://transactions/new` parses with "transactions" as the host.
  const path = `/${parsed.host}${parsed.pathname}`.replace(/\/+$/, '');
  return path === '/transactions/new' ? path : null;
}
