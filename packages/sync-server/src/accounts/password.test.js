import * as bcrypt from 'bcrypt';

import { getAccountDb } from '#account-db';

import {
  bootstrapPassword,
  changePassword,
  checkPassword,
  hashPassword,
  isValidPassword,
  loginWithPassword,
  setPasswordHash,
  verifyPassword,
} from './password';

const FALLBACK_OWNER_ID = 'password-test-owner';

function getStoredPasswordHash() {
  const row = getAccountDb().first(
    "SELECT extra_data FROM auth WHERE method = 'password'",
  );
  return row ? row.extra_data : null;
}

function ensureOwner() {
  const db = getAccountDb();
  const owner = db.first("SELECT id FROM users WHERE user_name = ''");
  if (!owner) {
    db.mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, 1, ?)',
      [FALLBACK_OWNER_ID, '', '', 'ADMIN'],
    );
  }
}

beforeEach(() => {
  const db = getAccountDb();
  db.mutate('DELETE FROM auth');
  db.mutate("DELETE FROM sessions WHERE auth_method = 'password'");
  ensureOwner();
});

afterEach(() => {
  const db = getAccountDb();
  db.mutate('DELETE FROM auth');
  db.mutate("DELETE FROM sessions WHERE auth_method = 'password'");
  db.mutate('DELETE FROM users WHERE id = ?', [FALLBACK_OWNER_ID]);
});

describe('isValidPassword', () => {
  it('rejects null, undefined and empty passwords', () => {
    expect(isValidPassword(null)).toBe(false);
    expect(isValidPassword(undefined)).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });

  it('accepts a non-empty password', () => {
    expect(isValidPassword('hunter2')).toBe(true);
  });
});

describe('hashPassword / verifyPassword', () => {
  it('hashes to an argon2id string and verifies the correct password', async () => {
    const hash = await hashPassword('correct horse');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword('correct horse', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse');

    expect(await verifyPassword('battery staple', hash)).toBe(false);
  });

  it('verifies a legacy bcrypt hash for backwards compatibility', async () => {
    const legacy = await bcrypt.hash('correct horse', 10);

    expect(await verifyPassword('correct horse', legacy)).toBe(true);
    expect(await verifyPassword('battery staple', legacy)).toBe(false);
  });

  it('returns false for non-string or malformed hashes instead of throwing', async () => {
    expect(await verifyPassword('x', null)).toBe(false);
    expect(await verifyPassword('x', undefined)).toBe(false);
    expect(await verifyPassword('x', 12345)).toBe(false);
    expect(await verifyPassword('x', 'not-a-real-hash')).toBe(false);
    expect(await verifyPassword('x', '$argon2id$garbage')).toBe(false);
  });
});

describe('loginWithPassword legacy hash upgrade', () => {
  it('logs in with a legacy bcrypt hash and upgrades it to argon2id', async () => {
    const legacy = await bcrypt.hash('correct horse', 10);
    setPasswordHash(legacy);

    const result = await loginWithPassword('correct horse');

    expect(result.error).toBeUndefined();
    expect(result.token).toBeTruthy();

    const stored = getStoredPasswordHash();
    expect(stored).not.toBe(legacy);
    expect(stored).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword('correct horse', stored)).toBe(true);
  });

  it('does not upgrade or change the stored hash when the password is wrong', async () => {
    const legacy = await bcrypt.hash('correct horse', 10);
    setPasswordHash(legacy);

    const result = await loginWithPassword('battery staple');

    expect(result.error).toBe('invalid-password');
    expect(result.token).toBeUndefined();
    expect(getStoredPasswordHash()).toBe(legacy);
  });

  it('does not rehash an existing argon2id hash on login', async () => {
    const hash = await hashPassword('correct horse');
    setPasswordHash(hash);

    const result = await loginWithPassword('correct horse');

    expect(result.token).toBeTruthy();
    expect(getStoredPasswordHash()).toBe(hash);
  });
});

describe('bootstrapPassword / changePassword', () => {
  it('stores an argon2id hash that verifies the password', async () => {
    expect(await bootstrapPassword('correct horse')).toEqual({});

    const stored = getStoredPasswordHash();
    expect(stored).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword('correct horse', stored)).toBe(true);
  });

  it('rejects an empty password on bootstrap', async () => {
    expect(await bootstrapPassword('')).toEqual({ error: 'invalid-password' });
  });

  it('replaces the stored hash on changePassword and verifies the new one', async () => {
    await bootstrapPassword('old password');
    const before = getStoredPasswordHash();

    expect(await changePassword('new password')).toEqual({});

    const after = getStoredPasswordHash();
    expect(after).not.toBe(before);
    expect(after).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword('new password', after)).toBe(true);
    expect(await verifyPassword('old password', after)).toBe(false);
  });

  it('rejects an empty password on changePassword', async () => {
    expect(await changePassword('')).toEqual({ error: 'invalid-password' });
  });
});

describe('checkPassword', () => {
  it('returns true for the correct stored password and false otherwise', async () => {
    await bootstrapPassword('correct horse');

    expect(await checkPassword('correct horse')).toBe(true);
    expect(await checkPassword('battery staple')).toBe(false);
  });

  it('returns false when no password is configured', async () => {
    expect(await checkPassword('anything')).toBe(false);
  });
});
