import { getAccountDb } from '#account-db';
import { config } from '#load-config';

import { loginWithOpenIdSetup } from './openid';

it.each(['', '/finances/'])(
  'includes the configured base path %s in the OpenID callback',
  async basePath => {
    const previousBasePath = config.get('basePath');
    const db = getAccountDb();
    config.set('basePath', basePath);
    db.mutate(
      'INSERT INTO auth (method, active, extra_data) VALUES (?, 1, ?)',
      [
        'openid',
        JSON.stringify({
          issuer: {
            name: 'https://identity.example',
            authorization_endpoint: 'https://identity.example/authorize',
            token_endpoint: 'https://identity.example/token',
            userinfo_endpoint: 'https://identity.example/userinfo',
          },
          client_id: 'client',
          client_secret: 'secret',
          server_hostname: `https://actual.example${basePath}`,
        }),
      ],
    );
    try {
      const result = await loginWithOpenIdSetup('https://actual.example');
      expect(result.error).toBeUndefined();
      const authorizationUrl = new URL(result.url ?? '');
      expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
        `https://actual.example${basePath ? '/finances' : ''}/openid/callback`,
      );
    } finally {
      db.mutate("DELETE FROM auth WHERE method = 'openid'");
      db.mutate('DELETE FROM pending_openid_requests');
      config.set('basePath', previousBasePath);
    }
  },
);
