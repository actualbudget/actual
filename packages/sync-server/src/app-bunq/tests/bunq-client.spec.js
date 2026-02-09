import {
  BunqInvalidResponseError,
  BunqProtocolError,
  BunqRateLimitError,
  BunqSignatureError,
} from '../errors';
import { BunqClient } from '../services/bunq-client';
import {
  generateBunqKeyPair,
  signRequestPayload,
} from '../services/bunq-crypto';

describe('bunq-client', () => {
  it('verifies server signature and parses session token + user id', async () => {
    const { privateKeyPem } = generateBunqKeyPair();
    const serverKeyPair = generateBunqKeyPair();

    const body = JSON.stringify({
      Response: [
        { Token: { token: 'session-token-1' } },
        { UserPerson: { id: 42 } },
      ],
    });

    const serverSignature = signRequestPayload(
      serverKeyPair.privateKeyPem,
      body,
    );

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => body,
      headers: {
        get(name) {
          if (name.toLowerCase() === 'x-bunq-server-signature') {
            return serverSignature;
          }
          return null;
        },
      },
    });

    const client = new BunqClient({
      apiKey: 'api-key',
      environment: 'production',
      clientPrivateKey: privateKeyPem,
      installationToken: 'installation-token',
      serverPublicKey: serverKeyPair.publicKeyPem,
      fetchImpl,
    });

    const result = await client.createSession();

    expect(result).toEqual({
      sessionToken: 'session-token-1',
      userId: '42',
    });
  });

  it('throws when response signature is invalid', async () => {
    const { privateKeyPem } = generateBunqKeyPair();
    const serverKeyPair = generateBunqKeyPair();

    const body = JSON.stringify({
      Response: [
        { Token: { token: 'session-token-1' } },
        { UserPerson: { id: 7 } },
      ],
    });

    const invalidSignature = signRequestPayload(
      serverKeyPair.privateKeyPem,
      'different-body',
    );

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => body,
      headers: {
        get(name) {
          if (name.toLowerCase() === 'x-bunq-server-signature') {
            return invalidSignature;
          }
          return null;
        },
      },
    });

    const client = new BunqClient({
      apiKey: 'api-key',
      environment: 'sandbox',
      clientPrivateKey: privateKeyPem,
      installationToken: 'installation-token',
      serverPublicKey: serverKeyPair.publicKeyPem,
      fetchImpl,
    });

    await expect(() => client.createSession()).rejects.toThrow(
      BunqSignatureError,
    );
  });

  it('supports cursor pagination params on payment listing', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ Response: [] }),
      headers: {
        get() {
          return null;
        },
      },
    });

    const client = new BunqClient({
      apiKey: 'api-key',
      environment: 'sandbox',
      clientPrivateKey: privateKeyPem,
      sessionToken: 'session-token',
      fetchImpl,
    });

    await client.listPayments('44', '99', { newerId: '1234', count: 50 });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining(
        '/user/44/monetary-account/99/payment?count=50&newer_id=1234',
      ),
      expect.any(Object),
    );
  });

  it('supports event listing with monetary account filter and pagination params', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ Response: [] }),
      headers: {
        get() {
          return null;
        },
      },
    });

    const client = new BunqClient({
      apiKey: 'api-key',
      environment: 'sandbox',
      clientPrivateKey: privateKeyPem,
      sessionToken: 'session-token',
      fetchImpl,
    });

    await client.listEvents('44', {
      count: 25,
      olderId: '500',
      monetaryAccountId: 'acc-1',
      displayUserEvent: false,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining(
        '/user/44/event?count=25&older_id=500&monetary_account_id=acc-1&display_user_event=false',
      ),
      expect.any(Object),
    );
  });

  it('maps 429 responses to rate limit errors', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
      headers: {
        get() {
          return null;
        },
      },
    });

    const client = new BunqClient({
      apiKey: 'api-key',
      environment: 'sandbox',
      clientPrivateKey: privateKeyPem,
      sessionToken: 'session-token',
      fetchImpl,
    });

    await expect(() => client.listMonetaryAccounts('42')).rejects.toThrow(
      BunqRateLimitError,
    );
  });

  it('maps invalid JSON responses to invalid response error class', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'not-json',
      headers: {
        get() {
          return null;
        },
      },
    });

    const client = new BunqClient({
      apiKey: 'api-key',
      environment: 'sandbox',
      clientPrivateKey: privateKeyPem,
      sessionToken: 'session-token',
      fetchImpl,
    });

    await expect(() => client.listMonetaryAccounts('42')).rejects.toThrow(
      BunqInvalidResponseError,
    );
  });
});
