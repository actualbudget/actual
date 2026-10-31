import { useEffect } from 'react';

import * as Platform from '@actual-app/core/shared/platform';
import { App as CapacitorApp } from '@capacitor/app';

import { useNavigate } from './useNavigate';

/**
 * Inside the iOS and Android apps, OpenID sign-in happens in the system
 * browser and comes back through the app's `actualbudget://` URL scheme
 * (declared in Info.plist and AndroidManifest.xml). Route that callback to
 * the in-app /openid-cb page, which writes the token and finishes the login.
 * Capacitor holds the event until a listener is attached, so this also
 * covers the app being launched cold by the callback.
 */
export function useMobileOpenIdCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Platform.isNativeMobileApp) {
      return;
    }

    const listener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      const { pathname, search } = new URL(url);
      if (pathname === '/openid-cb') {
        void navigate(pathname + search);
      }
    });
    return () => {
      void listener.then(handle => handle.remove());
    };
  }, [navigate]);
}
