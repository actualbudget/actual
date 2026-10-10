import * as bcrypt from 'bcrypt';

import * as nativeHash from './password-hash';
import * as workerdHash from './password-hash.workerd';

describe('workerd password hashing', () => {
  it('hashes to an argon2id string and verifies the correct password', async () => {
    const hash = await workerdHash.hashPassword('correct horse');

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=47104,t=1,p=1\$/);
    expect(await workerdHash.verifyPassword('correct horse', hash)).toBe(true);
    expect(await workerdHash.verifyPassword('wrong', hash)).toBe(false);
  });

  it('verifies hashes made by the native argon2 implementation', async () => {
    const hash = await nativeHash.hashPassword('correct horse');

    expect(await workerdHash.verifyPassword('correct horse', hash)).toBe(true);
    expect(await workerdHash.verifyPassword('wrong', hash)).toBe(false);
  });

  it('makes hashes the native argon2 implementation can verify', async () => {
    const hash = await workerdHash.hashPassword('correct horse');

    expect(await nativeHash.verifyPassword('correct horse', hash)).toBe(true);
    expect(await nativeHash.verifyPassword('wrong', hash)).toBe(false);
  });

  it('verifies a legacy bcrypt hash', async () => {
    const legacy = await bcrypt.hash('correct horse', 10);

    expect(await workerdHash.verifyPassword('correct horse', legacy)).toBe(
      true,
    );
    expect(await workerdHash.verifyPassword('wrong', legacy)).toBe(false);
  });

  it('rejects malformed hashes', async () => {
    expect(await workerdHash.verifyPassword('x', '$argon2id$garbage')).toBe(
      false,
    );
    expect(await workerdHash.verifyPassword('x', null)).toBe(false);
    expect(
      await workerdHash.verifyPassword(
        'x',
        '$argon2id$v=19$m=abc,t=1,p=1$c2FsdHNhbHQ$aGFzaA',
      ),
    ).toBe(false);
  });
});
