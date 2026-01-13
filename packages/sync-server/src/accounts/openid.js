import { custom, generators, Issuer } from 'openid-client';
import { v4 as uuidv4 } from 'uuid';

import {
  clearExpiredSessions,
  getAccountDb,
  listLoginMethods,
} from '../account-db';
import { config } from '../load-config';
import {
  getUserByUsername,
  transferAllFilesFromUser,
} from '../services/user-service';
import { TOKEN_EXPIRATION_NEVER } from '../util/validate-user';

import { checkPassword } from './password';

export async function bootstrapOpenId(configParameter) {
  if (!('issuer' in configParameter) && !('discoveryURL' in configParameter)) {
    return { error: 'missing-issuer-or-discoveryURL' };
  }
  if (!('client_id' in configParameter)) {
    return { error: 'missing-client-id' };
  }
  if (!('client_secret' in configParameter)) {
    return { error: 'missing-client-secret' };
  }
  if (!('server_hostname' in configParameter)) {
    return { error: 'missing-server-hostname' };
  }

  custom.setHttpOptionsDefaults({
    timeout: 20 * 1000, // 20 seconds
  });

  try {
    //FOR BACKWARD COMPATIBLITY:
    //If we don't put discoverURL into the issuer, it will break already enabled openid instances
    if (configParameter.discoveryURL) {
      configParameter.issuer = configParameter.discoveryURL;
      delete configParameter.discoveryURL;
    }

    await setupOpenIdClient(configParameter);
  } catch (err) {
    console.error('Error setting up OpenID client:', err);
    return { error: 'configuration-error' };
  }

  const accountDb = getAccountDb();
  try {
    accountDb.transaction(() => {
      accountDb.mutate('DELETE FROM auth WHERE method = ?', ['openid']);
      accountDb.mutate('UPDATE auth SET active = 0');
      accountDb.mutate(
        "INSERT INTO auth (method, display_name, extra_data, active) VALUES ('openid', 'OpenID', ?, 1)",
        [JSON.stringify(configParameter)],
      );
    });
  } catch (err) {
    console.error('Error updating auth table:', err);
    return { error: 'database-error' };
  }

  return {};
}

async function setupOpenIdClient(configParameter) {
  const issuer =
    typeof configParameter.issuer === 'string'
      ? await Issuer.discover(configParameter.issuer)
      : new Issuer({
          issuer: configParameter.issuer.name,
          authorization_endpoint: configParameter.issuer.authorization_endpoint,
          token_endpoint: configParameter.issuer.token_endpoint,
          userinfo_endpoint: configParameter.issuer.userinfo_endpoint,
        });

  const client = new issuer.Client({
    client_id: configParameter.client_id,
    client_secret: configParameter.client_secret,
    redirect_uri: new URL(
      '/openid/callback',
      configParameter.server_hostname,
    ).toString(),
    validate_id_token: true,
  });

  return client;
}

export async function loginWithOpenIdSetup(
  returnUrl,
  firstTimeLoginPassword = '',
) {
  if (!returnUrl) {
    return { error: 'return-url-missing' };
  }
  if (!isValidRedirectUrl(returnUrl)) {
    return { error: 'invalid-return-url' };
  }

  const accountDb = getAccountDb();

  const { countUsersWithUserName } = accountDb.first(
    'SELECT count(*) as countUsersWithUserName FROM users WHERE user_name <> ?',
    [''],
  );
  if (countUsersWithUserName === 0) {
    const methods = listLoginMethods();
    if (methods.some(authMethod => authMethod.method === 'password')) {
      const valid = checkPassword(firstTimeLoginPassword);

      if (!valid) {
        return { error: 'invalid-password' };
      }
    }
  }

  let config = accountDb.first('SELECT extra_data FROM auth WHERE method = ?', [
    'openid',
  ]);
  if (!config) {
    return { error: 'openid-not-configured' };
  }

  try {
    config = JSON.parse(config['extra_data']);
  } catch (err) {
    console.error('Error parsing OpenID configuration:', err);
    return { error: 'openid-setup-failed' };
  }

  let client;
  try {
    client = await setupOpenIdClient(config);
  } catch (err) {
    console.error('Error setting up OpenID client:', err);
    return { error: 'openid-setup-failed' };
  }

  const state = generators.state();
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);

  const now_time = Date.now();
  const expiry_time = now_time + 300 * 1000;

  accountDb.mutate(
    'DELETE FROM pending_openid_requests WHERE expiry_time < ?',
    [now_time],
  );
  accountDb.mutate(
    'INSERT INTO pending_openid_requests (state, code_verifier, return_url, expiry_time) VALUES (?, ?, ?, ?)',
    [state, code_verifier, returnUrl, expiry_time],
  );

  const url = client.authorizationUrl({
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge,
    code_challenge_method: 'S256',
  });

  return { url };
}

export async function loginWithOpenIdFinalize(body) {
  if (!body.code) {
    return { error: 'missing-authorization-code' };
  }
  if (!body.state) {
    return { error: 'missing-state' };
  }

  const accountDb = getAccountDb();
  let configFromDb = accountDb.first(
    "SELECT extra_data FROM auth WHERE method = 'openid' AND active = 1",
  );
  if (!configFromDb) {
    return { error: 'openid-not-configured' };
  }
  try {
    configFromDb = JSON.parse(configFromDb['extra_data']);
  } catch (err) {
    console.error('Error parsing OpenID configuration:', err);
    return { error: 'openid-setup-failed' };
  }
  let client;
  try {
    client = await setupOpenIdClient(configFromDb);
  } catch (err) {
    console.error('Error setting up OpenID client:', err);
    return { error: 'openid-setup-failed' };
  }

  const pendingRequest = accountDb.first(
    'SELECT code_verifier, return_url FROM pending_openid_requests WHERE state = ? AND expiry_time > ?',
    [body.state, Date.now()],
  );

  if (!pendingRequest) {
    return { error: 'invalid-or-expired-state' };
  }

  const { code_verifier, return_url } = pendingRequest;

  try {
    let tokenSet = null;

    if (!configFromDb.authMethod || configFromDb.authMethod === 'openid') {
      const params = { code: body.code, state: body.state, iss: body.iss };
      tokenSet = await client.callback(client.redirect_uris[0], params, {
        code_verifier,
        state: body.state,
      });
    } else {
      tokenSet = await client.grant({
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: client.redirect_uris[0],
        code_verifier,
      });
    }
    const userInfo = await client.userinfo(tokenSet.access_token);
    const identity =
      userInfo.preferred_username ??
      userInfo.login ??
      userInfo.email ??
      userInfo.id ??
      userInfo.sub;

    if (identity == null) {
      return { error: 'openid-grant-failed: no identification was found' };
    }

    let userId = null;
    try {
      accountDb.transaction(() => {
        const { countUsersWithUserName } = accountDb.first(
          'SELECT count(*) as countUsersWithUserName FROM users WHERE user_name <> ?',
          [''],
        );

        // Check if user was created by another transaction
        const existingUser = accountDb.first(
          'SELECT id FROM users WHERE user_name = ?',
          [identity],
        );

        if (
          !existingUser &&
          (countUsersWithUserName === 0 ||
            config.get('userCreationMode') === 'login')
        ) {
          userId = uuidv4();
          accountDb.mutate(
            'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, ?, ?)',
            [
              userId,
              identity,
              userInfo.name ?? userInfo.email ?? identity,
              countUsersWithUserName === 0 ? '1' : '0',
              countUsersWithUserName === 0 ? 'ADMIN' : 'BASIC',
            ],
          );

          if (countUsersWithUserName === 0) {
            const userFromPasswordMethod = getUserByUsername('');
            if (userFromPasswordMethod) {
              transferAllFilesFromUser(userId, userFromPasswordMethod.user_id);
            }
          }
        } else {
          const { id: userIdFromDb, display_name: displayName } =
            accountDb.first(
              'SELECT id, display_name FROM users WHERE user_name = ? and enabled = 1',
              [identity],
            ) || {};

          if (userIdFromDb == null) {
            throw new Error('openid-grant-failed');
          }

          if (!displayName && userInfo.name) {
            accountDb.mutate('UPDATE users set display_name = ? WHERE id = ?', [
              userInfo.name,
              userIdFromDb,
            ]);
          }

          userId = userIdFromDb;
        }
      });
    } catch (error) {
      if (error.message === 'user-already-exists') {
        return { error: 'user-already-exists' };
      } else if (error.message === 'openid-grant-failed') {
        return { error: 'openid-grant-failed' };
      } else {
        throw error; // Re-throw other unexpected errors
      }
    }

    const token = uuidv4();

    let expiration;
    if (config.get('token_expiration') === 'openid-provider') {
      expiration = tokenSet.expires_at ?? TOKEN_EXPIRATION_NEVER;
    } else if (config.get('token_expiration') === 'never') {
      expiration = TOKEN_EXPIRATION_NEVER;
    } else if (typeof config.get('token_expiration') === 'number') {
      expiration =
        Math.floor(Date.now() / 1000) + config.get('token_expiration');
    } else {
      expiration = Math.floor(Date.now() / 1000) + 10 * 60; // Default to 10 minutes
    }

    accountDb.mutate(
      'INSERT INTO sessions (token, expires_at, user_id, auth_method) VALUES (?, ?, ?, ?)',
      [token, expiration, userId, 'openid'],
    );

    clearExpiredSessions();

    return { url: `${return_url}/openid-cb?token=${token}` };
  } catch (err) {
    console.error('OpenID grant failed:', err);
    return { error: 'openid-grant-failed' };
  }
}

export function getServerHostname() {
  const auth = getAccountDb().first(
    'select * from auth WHERE method = ? and active = 1',
    ['openid'],
  );
  if (auth && auth.extra_data) {
    try {
      const openIdConfig = JSON.parse(auth.extra_data);
      return openIdConfig.server_hostname;
    } catch (error) {
      console.error('Error parsing OpenID configuration:', error);
    }
  }
  return null;
}

export function isValidRedirectUrl(url) {
  const serverHostname = getServerHostname();

  if (!serverHostname) {
    return false;
  }

  try {
    const redirectUrl = new URL(url);
    const serverUrl = new URL(serverHostname);

    if (
      redirectUrl.hostname === serverUrl.hostname ||
      redirectUrl.hostname === 'localhost'
    ) {
      return true;
    } else {
      return false;
    }
  } catch {
    return false;
  }
}
