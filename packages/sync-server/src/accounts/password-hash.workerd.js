import { argon2id } from '@noble/hashes/argon2.js';
import bcrypt from 'bcryptjs';

// Pure-JS password hashing for runtimes without native addons (Cloudflare
// Workers). Produces and verifies the same PHC strings as the native `argon2`
// package used by ./password-hash.js, so hashes are interchangeable.

// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id
const ARGON2_OPTIONS = { m: 47104, t: 1, p: 1 };
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

function toB64(bytes) {
  return Buffer.from(bytes).toString('base64').replace(/=+$/, '');
}

function fromB64(str) {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

export async function hashPassword(password) {
  const { m, t, p } = ARGON2_OPTIONS;
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const hash = argon2id(password, salt, { m, t, p, dkLen: HASH_LENGTH });
  return `$argon2id$v=19$m=${m},t=${t},p=${p}$${toB64(salt)}$${toB64(hash)}`;
}

function verifyArgon2(password, phc) {
  // $argon2id$v=19$m=47104,t=1,p=1$<salt>$<hash>
  const [, type, version, params, salt, hash] = phc.split('$');
  if (type !== 'argon2id' || version !== 'v=19' || !salt || !hash) {
    return false;
  }

  const options = Object.fromEntries(
    params.split(',').map(param => {
      const [key, value] = param.split('=');
      return [key, Number(value)];
    }),
  );
  if (![options.m, options.t, options.p].every(Number.isInteger)) {
    return false;
  }

  const expected = fromB64(hash);
  const actual = argon2id(password, fromB64(salt), {
    m: options.m,
    t: options.t,
    p: options.p,
    dkLen: expected.length,
  });

  let diff = expected.length ^ actual.length;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected[i] ^ actual[i];
  }
  return diff === 0;
}

export async function verifyPassword(password, hash) {
  if (typeof hash !== 'string') return false;

  if (hash.startsWith('$argon2')) {
    try {
      return verifyArgon2(password, hash);
    } catch {
      return false;
    }
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
