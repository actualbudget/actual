import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const PBKDF2_ITERATIONS = 10000;
const KEY_LENGTH = 32;

/**
 * Key derivation: same logic as loot-core server/encryption/encryption-internals.ts (Node).
 * createKeyBuffer(secret, salt) → pbkdf2Sync(secret, salt, 10000, 32, 'sha512').
 * Salt is passed as string; Node uses it as UTF-8.
 */
function createKeyBuffer(secret, salt) {
  return crypto.pbkdf2Sync(
    secret,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512',
  );
}

/**
 * Checks if a stored secret value is in the encrypted blob format.
 *
 * @param {string|object} value - The raw value from the database.
 * @returns {boolean}
 */
export function isEncryptedValue(value) {
  if (value == null) return false;
  let parsed;
  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return false;
  }
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    parsed.encrypted === true &&
    typeof parsed.salt === 'string' &&
    typeof parsed.iv === 'string' &&
    typeof parsed.authTag === 'string' &&
    typeof parsed.value === 'string'
  );
}

/**
 * Decrypts a secret stored in the encrypted blob format.
 * Uses the same logic as loot-core Node (encryption-internals.ts): key from createKeyBuffer(secret, salt).
 *
 * @param {string|object} encryptedBlob - JSON string or parsed object with encrypted, salt, iv, authTag, value.
 * @param {string} password - The decryption password.
 * @returns {string} The decrypted plaintext (UTF-8 string).
 * @throws {Error} On invalid blob format or decryption failure (e.g. wrong password).
 */
export function decryptSecret(encryptedBlob, password) {
  const parsed =
    typeof encryptedBlob === 'string'
      ? JSON.parse(encryptedBlob)
      : encryptedBlob;

  if (!isEncryptedValue(parsed)) {
    throw new Error('encrypted-secret-invalid-format');
  }

  const key = createKeyBuffer(password, parsed.salt);
  const iv = Buffer.from(parsed.iv, 'base64');
  const authTag = Buffer.from(parsed.authTag, 'base64');
  const ciphertext = Buffer.from(parsed.value, 'base64');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Encrypts a plaintext with a password. Same logic as loot-core Node:
 * salt = random 32 bytes base64, key = createKeyBuffer(password, salt), AES-256-GCM.
 * Sync server is the single place that encrypts/decrypts bank secrets (source of truth).
 *
 * @param {string} plaintext - Value to encrypt (UTF-8).
 * @param {string} password - Encryption password.
 * @returns {string} JSON string of blob { encrypted, salt, iv, authTag, value }.
 */
export function encryptSecret(plaintext, password) {
  const salt = crypto.randomBytes(32).toString('base64');
  const key = createKeyBuffer(password, salt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const blob = {
    encrypted: true,
    salt,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    value: encrypted.toString('base64'),
  };
  return JSON.stringify(blob);
}
