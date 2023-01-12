let crypto = require('crypto');

let ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export async function sha256String(str) {
  return crypto.createHash('sha256').update(str).digest('base64');
}

export function randomBytes(n) {
  return crypto.randomBytes(n);
}

export function encrypt(masterKey, value) {
  let masterKeyBuffer = masterKey.getValue().raw;
  // let iv = createKeyBuffer({ numBytes: 12, secret: masterKeyBuffer });
  let iv = crypto.randomBytes(12);
  let cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, masterKeyBuffer, iv);
  let encrypted = cipher.update(value);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  let authTag = cipher.getAuthTag();

  return {
    value: encrypted,
    meta: {
      keyId: masterKey.getId(),
      algorithm: ENCRYPTION_ALGORITHM,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    }
  };
}

export function decrypt(masterKey, encrypted, meta) {
  let masterKeyBuffer = masterKey.getValue().raw;
  let { algorithm, iv, authTag } = meta;
  iv = Buffer.from(iv, 'base64');

  authTag = Buffer.from(authTag, 'base64');

  let decipher = crypto.createDecipheriv(algorithm, masterKeyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
}

export function createKey({ secret, salt }) {
  let buffer = createKeyBuffer({ secret, salt });
  return {
    raw: buffer,
    base64: buffer.toString('base64')
  };
}

export function importKey(str) {
  return {
    raw: Buffer.from(str, 'base64'),
    base64: str
  };
}

/**
 * Generates a Buffer of a desired byte length to be used as either an encryption key or an initialization vector.
 *
 * @private
 * @param {Integer} [numBytes = 32] - Optional, number of bytes to fill the Buffer with.
 * @param {String} [secret = <random bytes>] - Optional, a secret to use as a basis for the key generation algorithm.
 * @returns {Buffer}
 */
function createKeyBuffer({ numBytes, secret, salt }) {
  return crypto.pbkdf2Sync(
    secret || crypto.randomBytes(128).toString('base64'),
    salt || crypto.randomBytes(32).toString('base64'),
    10000,
    numBytes || 32,
    'sha512'
  );
}
