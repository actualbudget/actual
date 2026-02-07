import {
  generateBunqKeyPair,
  signRequestPayload,
  verifyResponsePayloadSignature,
} from '../services/bunq-crypto';

describe('bunq-crypto', () => {
  it('signs and verifies payloads with generated keypair', () => {
    const { privateKeyPem, publicKeyPem } = generateBunqKeyPair();
    const payload = JSON.stringify({ test: true, amount: 12345 });

    const signature = signRequestPayload(privateKeyPem, payload);
    const verified = verifyResponsePayloadSignature(
      publicKeyPem,
      payload,
      signature,
    );

    expect(verified).toBe(true);
  });

  it('fails verification when payload differs', () => {
    const { privateKeyPem, publicKeyPem } = generateBunqKeyPair();
    const signature = signRequestPayload(privateKeyPem, 'payload-a');

    const verified = verifyResponsePayloadSignature(
      publicKeyPem,
      'payload-b',
      signature,
    );

    expect(verified).toBe(false);
  });
});
