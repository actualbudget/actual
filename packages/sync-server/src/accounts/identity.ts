import { v4 as uuidv4 } from 'uuid';

import { getAccountDb } from '#account-db';
import { config } from '#load-config';
import { transferAllFilesFromUser } from '#services/user-service';

export type ProviderIdentity = { provider: string; subject: string };

type Profile = {
  sub?: unknown;
  id?: unknown;
  preferred_username?: unknown;
  login?: unknown;
  email?: unknown;
  name?: unknown;
};

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function openIdIdentity(
  claims: { iss?: unknown; sub?: unknown },
  profile: Profile,
): ProviderIdentity {
  // claims() is read only after openid-client validates the ID token.
  if (
    !nonEmptyString(claims.iss) ||
    !nonEmptyString(claims.sub) ||
    profile.sub !== claims.sub
  ) {
    throw new Error('invalid-provider-identity');
  }
  return { provider: `oidc:${claims.iss}`, subject: claims.sub };
}

export function oauthIdentity(
  endpoint: string,
  profile: Profile,
): ProviderIdentity {
  const id = profile.id;
  if (
    !nonEmptyString(id) &&
    !(typeof id === 'number' && Number.isSafeInteger(id))
  ) {
    throw new Error('invalid-provider-identity');
  }
  return { provider: `oauth2:${new URL(endpoint).href}`, subject: String(id) };
}

export function linkIdentity(userId: string, identity: ProviderIdentity) {
  if (
    !nonEmptyString(userId) ||
    !nonEmptyString(identity.subject) ||
    !/^(oidc|oauth2):https?:\/\//.test(identity.provider)
  ) {
    throw new Error('invalid-provider-identity');
  }
  const db = getAccountDb();
  db.transaction(() => {
    if (!db.first('SELECT id FROM users WHERE id = ?', [userId])) {
      throw new Error('user-not-found');
    }
    const existing = db.first(
      'SELECT user_id, subject FROM openid_identities WHERE provider = ? AND (subject = ? OR user_id = ?)',
      [identity.provider, identity.subject, userId],
    );
    if (existing) {
      if (
        existing.user_id === userId &&
        existing.subject === identity.subject
      ) {
        return;
      }
      throw new Error('identity-binding-conflict');
    }
    db.mutate(
      'INSERT INTO openid_identities (provider, subject, user_id) VALUES (?, ?, ?)',
      [identity.provider, identity.subject, userId],
    );
  });
}

export function resolveIdentityUser(
  identity: ProviderIdentity,
  profile: Profile,
): string {
  const db = getAccountDb();
  let userId: string | undefined;
  db.transaction(() => {
    const existing = db.first(
      `SELECT users.id, users.enabled FROM openid_identities
       JOIN users ON users.id = openid_identities.user_id
       WHERE provider = ? AND subject = ?`,
      [identity.provider, identity.subject],
    );
    if (existing) {
      if (!existing.enabled) {
        throw new Error('openid-grant-failed');
      }
      userId = existing.id;
      return;
    }

    const username = [
      profile.preferred_username,
      profile.login,
      profile.email,
      typeof profile.id === 'number' ? String(profile.id) : profile.id,
      profile.sub,
      identity.subject,
    ].find(nonEmptyString);
    const legacyUser = db.first(
      'SELECT id, enabled FROM users WHERE user_name = ?',
      [username],
    );
    if (legacyUser) {
      if (!legacyUser.enabled) {
        throw new Error('openid-grant-failed');
      }
      // Use legacy matching only until this account has a stable identity.
      // A different subject or provider must never claim an already linked user.
      if (
        db.first('SELECT 1 FROM openid_identities WHERE user_id = ?', [
          legacyUser.id,
        ])
      ) {
        throw new Error('identity-not-linked');
      }
      linkIdentity(legacyUser.id, identity);
      userId = legacyUser.id;
      return;
    }

    const { count } = db.first(
      "SELECT count(*) AS count FROM users WHERE user_name <> ''",
    );
    if (count !== 0 && config.get('userCreationMode') !== 'login') {
      throw new Error('identity-not-linked');
    }
    userId = uuidv4();
    const displayName = nonEmptyString(profile.name) ? profile.name : username;
    db.mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, ?, ?)',
      [
        userId,
        username,
        displayName,
        count === 0 ? 1 : 0,
        count === 0 ? 'ADMIN' : 'BASIC',
      ],
    );
    linkIdentity(userId, identity);
    if (count === 0) {
      const passwordOwner = db.first(
        "SELECT id FROM users WHERE user_name = ''",
      );
      if (passwordOwner) {
        transferAllFilesFromUser(userId, passwordOwner.id);
      }
    }
  });
  if (!userId) {
    throw new Error('openid-grant-failed');
  }
  return userId;
}
