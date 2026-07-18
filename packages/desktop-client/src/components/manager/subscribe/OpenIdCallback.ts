import { useEffect } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

export function OpenIdCallback() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    void send('subscribe-set-token', { token: token as string }).then(() => {
      // The callback page intentionally ran on a direct worker (see
      // browser-preload.js). Re-boot at the app root so this tab rejoins
      // multi-tab coordination; the token is now persisted, so the normal
      // boot auto-logs-in. Use replace() so the ?token= URL stays out of
      // history and the back button can't re-trigger a stale token.
      const root = window.location.pathname.replace(/openid-cb\/?$/, '') || '/';
      window.location.replace(root);
    });
  });
  return null;
}
