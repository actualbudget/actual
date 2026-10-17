import * as argon2w from '@hallaxius/argon2w';
import { argon2id } from '@noble/hashes/argon2.js';
import bcrypt from 'bcryptjs';

// Password hashing for runtimes without native addons (Cloudflare Workers).
// Produces and verifies the same PHC strings as the native `argon2` package
// used by ./password-hash.js, so hashes are interchangeable.
//
// argon2w (WASM) caps memory at 32 MiB, so new hashes use m=19456,t=1
// instead of m=47104,t=1 (below OWASP's m=19456,t=2, to keep CPU time per
// login down). Hashes above that cap (made by
// the native server or an older Worker) are verified with pure-JS
// @noble/hashes.

// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 1, parallelism: 1 };

function fromB64(str) {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

export function hashPassword(password) {
  return argon2w.hash(password, ARGON2_OPTIONS);
}

// Parses $argon2id$v=19$m=47104,t=1,p=1$<salt>$<hash>. Native argon2 0.45+
// writes the params as m,p,t, so don't depend on their order.
function parseArgon2idPhc(phc) {
  const [, type, version, params, salt, hash] = phc.split('$');
  if (type !== 'argon2id' || version !== 'v=19' || !params || !salt || !hash) {
    return null;
  }

  const options = Object.fromEntries(
    params.split(',').map(param => {
      const [key, value] = param.split('=');
      return [key, Number(value)];
    }),
  );
  if (![options.m, options.t, options.p].every(Number.isInteger)) {
    return null;
  }

  return { m: options.m, t: options.t, p: options.p, salt, hash };
}

function verifyArgon2Noble(password, { m, t, p, salt, hash }) {
  const expected = fromB64(hash);
  const actual = argon2id(password, fromB64(salt), {
    m,
    t,
    p,
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
      const phc = parseArgon2idPhc(hash);
      if (!phc) return false;
      if (phc.m <= argon2w.MAX_MEMORY_KIB) {
        // argon2w only parses the m,t,p order.
        const canonical = `$argon2id$v=19$m=${phc.m},t=${phc.t},p=${phc.p}$${phc.salt}$${phc.hash}`;
        return await argon2w.verify(canonical, password, {
          maxMemoryKib: argon2w.MAX_MEMORY_KIB,
        });
      }
      return verifyArgon2Noble(password, phc);
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
