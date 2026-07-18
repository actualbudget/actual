import { useEffect } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import * as Platform from '@actual-app/core/shared/platform';

// On Electron the callback URL is reloaded once to finish login (see below);
// this records the token we've already reloaded for so a re-run of this
// component (the reloaded page mounts it again) doesn't loop.
const RELOADED_TOKEN_KEY = 'openid-cb-reloaded-token';

export function OpenIdCallback() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    const root = window.location.pathname.replace(/openid-cb\/?$/, '') || '/';

    if (!token) {
      // Nothing to persist — return to the start of the login flow.
      window.location.replace(root);
      return;
    }

    void send('subscribe-set-token', { token }).then(() => {
      // Persisting the token isn't enough to finish login in place: the budget
      // manager's own mount-effect login races ahead of this write, its file
      // list fetch 401s on the stale pre-login token (get-remote-files throws,
      // so `files` never loads), and the app never navigates off /openid-cb.
      // Reloading re-runs the boot flow with the token already stored, which
      // logs in cleanly — the same recovery as a manual refresh.
      if (Platform.isBrowser) {
        // `replace` keeps the ?token= URL out of history.
        window.location.replace(root);
        return;
      }

      // Electron (served over app://): reload the callback URL itself.
      // Reload only once per token so the reloaded page doesn't loop.
      if (sessionStorage.getItem(RELOADED_TOKEN_KEY) === token) {
        return;
      }

      sessionStorage.setItem(RELOADED_TOKEN_KEY, token);
      window.location.reload();
    });
  }, []);
  return null;
}
