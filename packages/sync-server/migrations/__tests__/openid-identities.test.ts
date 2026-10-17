import { getAccountDb } from '#account-db';
import { openDatabase } from '#db';
import { down, up } from '../1790467200000-openid-identities';

vi.mock('#account-db', () => ({ getAccountDb: vi.fn() }));

it('revokes OpenID sessions and pending logins without changing users or password sessions', async () => {
  const db = openDatabase(':memory:');
  vi.mocked(getAccountDb).mockReturnValue(db);
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, owner INTEGER, role TEXT);
    CREATE TABLE sessions (token TEXT, auth_method TEXT);
    CREATE TABLE pending_openid_requests (state TEXT);
    INSERT INTO users VALUES ('original-user', 1, 'ADMIN');
    INSERT INTO sessions VALUES ('old-openid', 'openid'), ('password-token', 'password');
    INSERT INTO pending_openid_requests VALUES ('old-state');
  `);
  try {
    await up();
    expect(db.all('SELECT * FROM sessions')).toEqual([
      { token: 'password-token', auth_method: 'password' },
    ]);
    expect(db.all('SELECT * FROM pending_openid_requests')).toEqual([]);
    expect(db.all('SELECT * FROM openid_identities')).toEqual([]);
    expect(db.all('SELECT * FROM users')).toEqual([
      { id: 'original-user', owner: 1, role: 'ADMIN' },
    ]);
    await down();
    expect(db.all('SELECT * FROM sessions')).toHaveLength(1);
  } finally {
    db.close();
  }
});
