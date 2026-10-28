import { useEffect, useEffectEvent } from 'react';

import { useNavigate } from '#hooks/useNavigate';

import {
  getHomeScreenWidgetsPlugin,
  routeForWidgetUrl,
} from './homeScreenWidgetsPlugin';
import type { HomeScreenWidgetsPlugin } from './homeScreenWidgetsPlugin';

/**
 * Opens the page an iOS home screen widget was tapped on. Renders nothing;
 * does nothing outside the iOS app.
 */
export function HomeScreenWidgets() {
  const plugin = getHomeScreenWidgetsPlugin();
  if (!plugin) {
    return null;
  }
  return <HomeScreenWidgetsListener plugin={plugin} />;
}

type HomeScreenWidgetsListenerProps = {
  plugin: HomeScreenWidgetsPlugin;
};

function HomeScreenWidgetsListener({ plugin }: HomeScreenWidgetsListenerProps) {
  const navigate = useNavigate();

  const openWidgetUrl = useEffectEvent((url: string) => {
    const route = routeForWidgetUrl(url);
    if (route) {
      void navigate(route);
    }
  });

  useEffect(() => {
    const handle = plugin.addListener('urlOpen', ({ url }) =>
      openWidgetUrl(url),
    );
    return () => {
      void handle.then(listener => listener.remove());
    };
  }, [plugin]);

  return null;
}
