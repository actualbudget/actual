// The service worker answers page loads from its cache, so the browser never
// asks the server for the page and never gets to show its own prompts. With a
// self-signed certificate the browser has stopped trusting, that leaves every
// server request failing with no way to accept the certificate again (#7026).
//
// This URL is in `navigateFallbackDenylist` (vite.config.mts), so loading it
// goes to the server. The service worker stays registered: if the server is
// unreachable, opening the app normally still works offline.
export const RELOAD_FROM_SERVER_SEARCH = '?reload-from-server';
export function canReloadFromServer() {
  return navigator.onLine && !!navigator.serviceWorker?.controller;
}

// Reloading only reaches the server the app itself was loaded from.
export function isAppOrigin(url: string | null | undefined) {
  try {
    return new URL(url ?? '').origin === window.location.origin;
  } catch {
    return false;
  }
}

export function reloadFromServer() {
  window.location.assign('/' + RELOAD_FROM_SERVER_SEARCH);
}
