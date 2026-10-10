import { getAccountDb } from '#account-db';
import { config } from '#load-config';

import {
  linkIdentity,
  oauthIdentity,
  openIdIdentity,
  resolveIdentityUser,
} from './identity';

const identity = {
  provider: 'oidc:https://identity.example',
  subject: 'stable-123',
};
const userId = 'identity-test-user';

beforeEach(() => {
  getAccountDb().mutate(
    'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, 1, ?)',
    [userId, 'old-name', 'Original owner', 'ADMIN'],
  );
});

afterEach(() => {
  getAccountDb().mutate(
    "DELETE FROM openid_identities WHERE provider LIKE '%identity.example%'",
  );
  getAccountDb().mutate('DELETE FROM users WHERE id = ?', [userId]);
  vi.restoreAllMocks();
});

it('uses validated issuer and subject, never profile names', () => {
  expect(
    openIdIdentity(
      { iss: 'https://identity.example', sub: 'stable-123' },
      {
        sub: 'stable-123',
        preferred_username: 'admin',
        email: 'admin@example.org',
      },
    ),
  ).toEqual(identity);
  expect(() =>
    openIdIdentity(
      { iss: 'https://identity.example', sub: 'stable-123' },
      { sub: 'other' },
    ),
  ).toThrow('invalid-provider-identity');
  expect(() => openIdIdentity({}, { preferred_username: 'admin' })).toThrow(
    'invalid-provider-identity',
  );
});

it('uses the immutable OAuth2 ID within the configured endpoint namespace', () => {
  expect(
    oauthIdentity('https://identity.example/profile', {
      id: 42,
      login: 'mutable',
    }),
  ).toEqual({
    provider: 'oauth2:https://identity.example/profile',
    subject: '42',
  });
  expect(() =>
    oauthIdentity('https://identity.example/profile', {
      login: 'mutable',
      email: 'email',
    }),
  ).toThrow('invalid-provider-identity');
});

it('preserves user ID and permissions across provider username changes', () => {
  const db = getAccountDb();
  const before = db.first('SELECT * FROM users WHERE id = ?', [userId]);
  linkIdentity(userId, identity);
  expect(
    resolveIdentityUser(identity, { preferred_username: 'new-name' }),
  ).toBe(userId);
  expect(db.first('SELECT * FROM users WHERE id = ?', [userId])).toEqual(
    before,
  );
});

it('does not link a recycled username, including with automatic creation enabled', () => {
  const originalGet = config.get.bind(config);
  vi.spyOn(config, 'get').mockImplementation(key =>
    key === 'userCreationMode' ? 'login' : originalGet(key),
  );
  linkIdentity(userId, identity);
  expect(() =>
    resolveIdentityUser(
      { ...identity, subject: 'new-owner' },
      { preferred_username: 'old-name' },
    ),
  ).toThrow('identity-not-linked');
});

it.each([
  {
    preferred_username: 'old-name',
    login: 'other',
    email: 'other@example.org',
  },
  { login: 'old-name', email: 'other@example.org' },
  { email: 'old-name', id: 'other' },
  { id: 'old-name', sub: 'other' },
  { sub: 'old-name' },
])(
  'links an existing account on its next login using legacy claims: %j',
  profile => {
    const db = getAccountDb();
    const before = db.first('SELECT * FROM users WHERE id = ?', [userId]);
    expect(resolveIdentityUser(identity, profile)).toBe(userId);
    expect(
      db.all('SELECT * FROM openid_identities WHERE user_id = ?', [userId]),
    ).toEqual([{ ...identity, user_id: userId }]);
    expect(db.first('SELECT * FROM users WHERE id = ?', [userId])).toEqual(
      before,
    );
    expect(
      resolveIdentityUser(identity, { preferred_username: 'renamed' }),
    ).toBe(userId);
  },
);

it('links OAuth2 users whose legacy username was a numeric provider ID', () => {
  const db = getAccountDb();
  db.mutate('UPDATE users SET user_name = ? WHERE id = ?', ['42', userId]);
  const profile = { id: 42 };
  const oauth = oauthIdentity('https://identity.example/profile', profile);
  expect(resolveIdentityUser(oauth, profile)).toBe(userId);
  expect(resolveIdentityUser(oauth, { id: 42, login: 'new-name' })).toBe(
    userId,
  );
});

it('rejects disabled users before creating a binding', () => {
  const db = getAccountDb();
  db.mutate('UPDATE users SET enabled = 0 WHERE id = ?', [userId]);
  expect(() =>
    resolveIdentityUser(identity, { preferred_username: 'old-name' }),
  ).toThrow('openid-grant-failed');
  expect(
    db.all('SELECT * FROM openid_identities WHERE user_id = ?', [userId]),
  ).toEqual([]);
});

it('does not let a later login replace an automatically linked identity', () => {
  expect(
    resolveIdentityUser(identity, { preferred_username: 'old-name' }),
  ).toBe(userId);
  expect(() =>
    resolveIdentityUser(
      { ...identity, subject: 'different' },
      { preferred_username: 'old-name' },
    ),
  ).toThrow('identity-not-linked');
  expect(resolveIdentityUser(identity, {})).toBe(userId);
});

it('does not match the same subject from a different issuer', () => {
  linkIdentity(userId, identity);
  expect(() =>
    resolveIdentityUser(
      { ...identity, provider: 'oidc:https://other.identity.example' },
      { preferred_username: 'old-name' },
    ),
  ).toThrow('identity-not-linked');
});

it('rejects disabled users even with a valid binding', () => {
  linkIdentity(userId, identity);
  getAccountDb().mutate('UPDATE users SET enabled = 0 WHERE id = ?', [userId]);
  expect(() => resolveIdentityUser(identity, {})).toThrow(
    'openid-grant-failed',
  );
});

it('accepts identical mappings and rejects conflicting or unknown users', () => {
  linkIdentity(userId, identity);
  linkIdentity(userId, identity);
  expect(() =>
    linkIdentity(userId, { ...identity, subject: 'different' }),
  ).toThrow('identity-binding-conflict');
  expect(() => linkIdentity('genericAdmin', identity)).toThrow(
    'identity-binding-conflict',
  );
  expect(() => linkIdentity('missing-user', identity)).toThrow(
    'user-not-found',
  );
  expect(
    getAccountDb().all('SELECT * FROM openid_identities WHERE user_id = ?', [
      userId,
    ]),
  ).toHaveLength(1);
});

it('does not promote the first mapped user when existing users are present', () => {
  const db = getAccountDb();
  db.mutate('UPDATE users SET role = ?, owner = 0 WHERE id = ?', [
    'BASIC',
    userId,
  ]);
  expect(
    resolveIdentityUser(identity, { preferred_username: 'old-name' }),
  ).toBe(userId);
  expect(
    db.first('SELECT role, owner FROM users WHERE id = ?', [userId]),
  ).toEqual({ role: 'BASIC', owner: 0 });
});
