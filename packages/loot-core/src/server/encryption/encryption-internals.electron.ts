// @ts-strict-ignore
import crypto from 'crypto';

import type * as T from './encryption-internals';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm' as const;

export const randomBytes: typeof T.randomBytes = n => {
  return crypto.randomBytes(n);
};

export const encrypt: typeof T.encrypt = async (masterKey, value) => {
  const masterKeyBuffer = masterKey.getValue().raw;
  // let iv = createKeyBuffer({ numBytes: 12, secret: masterKeyBuffer });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    ENCRYPTION_ALGORITHM,
    masterKeyBuffer,
    iv,
  );
  let encrypted = cipher.update(value);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  return {
    value: encrypted,
    meta: {
      keyId: masterKey.getId(),
      algorithm: ENCRYPTION_ALGORITHM,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    },
  };
};

export const decrypt: typeof T.decrypt = async (masterKey, encrypted, meta) => {
  const masterKeyBuffer = masterKey.getValue().raw;
  const { algorithm, iv: originalIv, authTag: originalAuthTag } = meta;
  const iv = Buffer.from(originalIv, 'base64');
  const authTag = Buffer.from(originalAuthTag, 'base64');

  const decipher = crypto.createDecipheriv(algorithm, masterKeyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
};

// @ts-expect-error fix me
export const createKey: typeof T.createKey = async ({ secret, salt }) => {
  const buffer = createKeyBuffer({ secret, salt });
  return {
    raw: buffer,
    base64: buffer.toString('base64'),
  };
};

// @ts-expect-error fix me
export const importKey: typeof T.importKey = str => {
  return {
    raw: Buffer.from(str, 'base64'),
    base64: str,
  };
};

/**
 * Generates a Buffer of a desired byte length to be used as either an encryption key or an initialization vector.
 *
 * @private
 */
function createKeyBuffer({
  numBytes,
  secret,
  salt,
}: {
  numBytes?: number;
  secret?: string;
  salt?: string;
}) {
  return crypto.pbkdf2Sync(
    secret || crypto.randomBytes(128).toString('base64'),
    salt || crypto.randomBytes(32).toString('base64'),
    10000,
    numBytes || 32,
    'sha512',
  );
}
