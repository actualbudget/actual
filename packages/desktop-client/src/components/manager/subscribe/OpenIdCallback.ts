import { useEffect } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import * as Platform from '@actual-app/core/shared/platform';

import { useDispatch } from '#redux';
import { loggedIn } from '#users/usersSlice';

export function OpenIdCallback() {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    void send('subscribe-set-token', { token: token as string }).then(() => {
      if (Platform.isBrowser) {
        // On the web the callback page intentionally ran on a direct worker
        // (see browser-preload.js) to avoid the SharedWorker coordinator
        // leaving this tab UNASSIGNED. Re-boot at the app root so the tab
        // rejoins multi-tab coordination; the token is now persisted, so the
        // normal boot auto-logs-in. replace() keeps the ?token= URL out of
        // history so the back button can't re-trigger a stale token.
        const root =
          window.location.pathname.replace(/openid-cb\/?$/, '') || '/';
        window.location.replace(root);
        return;
      }

      // Electron has no SharedWorker (own IPC backend), so there's nothing to
      // rejoin — complete the login in-place as before.
      void dispatch(loggedIn());
    });
  });
  return null;
}
