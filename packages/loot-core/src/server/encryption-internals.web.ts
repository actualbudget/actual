let ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function browserAlgorithmName(name) {
  switch (name) {
    case 'aes-256-gcm':
      return 'AES-GCM';
    default:
      throw new Error('unsupported crypto algorithm: ' + name);
  }
}

export async function sha256String(str) {
  // @ts-expect-error TextEncoder might not accept an argument
  let inputBuffer = new TextEncoder('utf-8').encode(str).buffer;
  let buffer = await crypto.subtle.digest('sha-256', inputBuffer);
  let outputStr = Array.from(new Uint8Array(buffer))
    .map(n => String.fromCharCode(n))
    .join('');
  return btoa(outputStr);
}

export function randomBytes(n) {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(n)));
}

export async function encrypt(masterKey, value) {
  let iv = crypto.getRandomValues(new Uint8Array(12));

  let encrypted = await crypto.subtle.encrypt(
    {
      name: browserAlgorithmName(ENCRYPTION_ALGORITHM),
      iv,
      tagLength: 128,
    },
    masterKey.getValue().raw,
    value,
  );

  encrypted = Buffer.from(encrypted);

  // Strip the auth tag off the end
  let authTag = encrypted.slice(-16);
  encrypted = encrypted.slice(0, -16);

  return {
    value: encrypted,
    meta: {
      keyId: masterKey.getId(),
      algorithm: ENCRYPTION_ALGORITHM,
      iv: Buffer.from(iv).toString('base64'),
      // @ts-expect-error base64 argument is valid only on NodeJS
      authTag: authTag.toString('base64'),
    },
  };
}

export async function decrypt(masterKey, encrypted, meta) {
  let { algorithm, iv, authTag } = meta;

  let decrypted = await crypto.subtle.decrypt(
    {
      name: browserAlgorithmName(algorithm),
      iv: Buffer.from(iv, 'base64'),
      tagLength: 128,
    },
    masterKey.getValue().raw,
    Buffer.concat([encrypted, Buffer.from(authTag, 'base64')]),
  );

  return Buffer.from(decrypted);
}

export async function createKey({ secret, salt }) {
  let passwordBuffer = Buffer.from(secret);
  let saltBuffer = Buffer.from(salt);

  let passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  );

  let derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-512',
      salt: saltBuffer,
      iterations: 10000,
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  let exported = await crypto.subtle.exportKey('raw', derivedKey);

  return {
    raw: derivedKey,
    base64: Buffer.from(exported).toString('base64'),
  };
}

export async function importKey(str) {
  let key = await crypto.subtle.importKey(
    'raw',
    Buffer.from(str, 'base64'),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  return {
    raw: key,
    base64: str,
  };
}
