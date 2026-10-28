// Bridge to the `HomeScreenWidgets` Capacitor plugin that ships with the iOS
// app (packages/mobile-client/ios/App/App/WidgetsPlugin.swift). The app
// writes a snapshot of the data its home screen widgets show, and the widgets
// open the app with `actualbudget://` links that are mapped to routes here.
//
// The web build has no dependency on @capacitor/core: the native runtime
// injects `window.Capacitor`, and everything is a no-op without it.

export type WidgetAmount = {
  /** Integer amount (in the minor currency unit), only used for colouring. */
  amount: number;
  /** Formatted with the user's number format; masked in privacy mode. */
  formatted: string;
};

/**
 * Keep in sync with `WidgetSnapshot` in
 * packages/mobile-client/ios/App/ActualWidgets/WidgetSnapshot.swift.
 */
export type WidgetSnapshot = {
  version: 1;
  updatedAt: number;
  budgetName: string;
  monthName: string;
  isPrivacyEnabled: boolean;
  /** Translated by the app so the widgets follow its language. */
  labels: {
    budget: string;
    accounts: string;
    /** "To budget" for envelope budgets, "Saved" for tracking budgets. */
    summary: string;
    addTransaction: string;
  };
  summary: WidgetAmount;
  accountsTotal: WidgetAmount;
  accounts: Array<{ id: string; name: string; balance: WidgetAmount }>;
  categories: Array<{
    id: string;
    name: string;
    balance: WidgetAmount;
    budgeted: number;
    /** Activity this month, negative for spending. */
    spent: number;
  }>;
};

type PluginListenerHandle = { remove: () => Promise<void> };

export type HomeScreenWidgetsPlugin = {
  /** `snapshot` is a `WidgetSnapshot` serialized as JSON. */
  updateSnapshot: (options: { snapshot: string }) => Promise<void>;
  clearSnapshot: () => Promise<void>;
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
 * Maps a deep link opened by a widget (see `WidgetLink` in
 * packages/mobile-client/ios/App/ActualWidgets/WidgetStyle.swift) to an
 * in-app route. Returns null for anything that is not a known widget link.
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

  // `actualbudget://accounts/<id>` parses with "accounts" as the host.
  const path = `/${parsed.host}${parsed.pathname}`.replace(/\/+$/, '');
  switch (path) {
    case '/budget':
    case '/accounts':
    case '/transactions/new':
      return path;
    default:
      return /^\/accounts\/[\w-]+$/.test(path) ? path : null;
  }
}
