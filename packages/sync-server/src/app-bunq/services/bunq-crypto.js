import {
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  generateKeyPairSync,
} from 'node:crypto';

/**
 * @returns {{ privateKeyPem: string; publicKeyPem: string }}
 */
export function generateBunqKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
  });

  return {
    privateKeyPem: privateKey,
    publicKeyPem: publicKey,
  };
}

/**
 * @param {string} privateKeyPem
 */
export function getPublicKeyFromPrivateKey(privateKeyPem) {
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKey = createPublicKey(privateKey);
  return publicKey.export({ format: 'pem', type: 'spki' }).toString();
}

/**
 * @param {string} privateKeyPem
 * @param {string|Buffer} payload
 */
export function signRequestPayload(privateKeyPem, payload) {
  const signer = createSign('RSA-SHA256');
  signer.update(payload);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

/**
 * @param {string} publicKeyPem
 * @param {string|Buffer} payload
 * @param {string} signatureBase64
 */
export function verifyResponsePayloadSignature(
  publicKeyPem,
  payload,
  signatureBase64,
) {
  const verifier = createVerify('RSA-SHA256');
  verifier.update(payload);
  verifier.end();
  return verifier.verify(publicKeyPem, signatureBase64, 'base64');
}

