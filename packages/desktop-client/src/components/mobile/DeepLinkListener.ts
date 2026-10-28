import { useEffect, useEffectEvent } from 'react';

import { useNavigate } from '#hooks/useNavigate';

import { getAppPlugin, routeForAppUrl } from './deepLinks';

/**
 * Opens the page a deep link points at when the native mobile app is
 * opened with one. Renders nothing; does nothing outside the native app.
 *
 * Mounted inside FinancesApp on purpose: the native side holds the link
 * until something listens, so a cold start from a widget tap navigates
 * only once the budget is open and the target route exists.
 */
export function DeepLinkListener() {
  const navigate = useNavigate();

  const openUrl = useEffectEvent((url: string) => {
    const route = routeForAppUrl(url);
    if (route) {
      void navigate(route);
    }
  });

  useEffect(() => {
    const plugin = getAppPlugin();
    if (!plugin) {
      return;
    }
    const handle = plugin.addListener('appUrlOpen', ({ url }) => openUrl(url));
    return () => {
      void handle.then(listener => listener.remove());
    };
  }, []);

  return null;
}
